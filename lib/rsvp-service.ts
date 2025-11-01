import { supabaseServer } from './supabase-server'
import { rsvpSchema, type RsvpInput } from './validators'
import { 
  logRsvpSubmit, 
  logRsvpConfirmationEmailSend, 
  logRsvpDeclineMessage 
} from './audit'
import { generateEmailQR } from './qr'
import { generateDigitalPass, type DigitalPassData } from './digital-pass'
import { getWeddingId } from './wedding-context'

export interface RsvpResult {
  status: 'accepted' | 'declined'
  guestName: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
  }>
  rsvpUrl: string
  qrImageUrl?: string
  passUrl?: string
}

export interface InvitationWithEvents {
  id: string
  token: string
  wedding_id?: string
  guest: {
    id: string
    first_name: string
    last_name: string
    email: string
    invite_code: string
  }
  invitation_events: Array<{
    id: string
    event_id: string
    status: 'pending' | 'accepted' | 'declined' | 'waitlist'
    headcount: number
    event: {
      id: string
      name: string
      starts_at: string
      venue: string
      address?: string
    }
  }>
}

/**
 * Resolve invitation by invite code
 */
export async function resolveInvitationByCode(
  inviteCode: string
): Promise<InvitationWithEvents | null> {
  try {
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          invite_code
        ),
        invitation_events(
          id,
          event_id,
          status,
          headcount,
          event:events(
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)
      .eq('guest.invite_code', inviteCode)
      .single()

    if (error) {
      console.error('Error resolving invitation:', error)
      return null
    }

    return data as InvitationWithEvents
  } catch (error) {
    console.error('Error resolving invitation:', error)
    return null
  }
}

/**
 * Validate invite_code and get invitation token
 */
export async function validateInviteCodeAndGetToken(
  inviteCode: string
): Promise<{ success: boolean; invitation?: InvitationWithEvents; error?: string }> {
  try {
    const supabase = await supabaseServer()
    
    // Look up invitation by guest's invite_code
    const { data, error } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          invite_code
        ),
        invitation_events(
          id,
          event_id,
          status,
          headcount,
          event:events(
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)
      .eq('guest.invite_code', inviteCode)
      .single()

    if (error || !data) {
      return {
        success: false,
        error: 'Invalid invite code. Please check your invitation and try again.'
      }
    }

    return {
      success: true,
      invitation: data as InvitationWithEvents
    }
  } catch (error) {
    console.error('Error validating invite code:', error)
    return {
      success: false,
      error: 'Failed to validate invite code. Please try again.'
    }
  }
}

/**
 * Submit RSVP for all events in an invitation
 */
export async function submitRsvpToDatabase(
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  goodwillMessage?: string
): Promise<boolean> {
  try {
    const supabase = await supabaseServer()
    
    // Use the submit_rsvp_v2 RPC function for each invitation event
    for (const invitationEvent of invitation.invitation_events) {
      const { error } = await supabase.rpc('submit_rsvp_v2', {
        p_event_id: invitationEvent.event_id,
        p_invite_token: invitation.token,
        p_response: response,
        p_party_size: 1, // Fixed at 1 as per requirements
        p_message: goodwillMessage || null
      })

      if (error) {
        console.error('Error submitting RSVP for event:', invitationEvent.event.name, error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error submitting RSVP to database:', error)
    return false
  }
}

/**
 * Send RSVP confirmation email
 */
export async function sendRsvpConfirmationEmail(
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  emailOverride?: string,
  goodwillMessage?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = await supabaseServer()
    
    // Get wedding context for dynamic data
    const weddingId = invitation.wedding_id || await getWeddingId()
    let coupleDisplayName = 'Wedding Celebration'
    let contactEmail = 'contact@luwani.com'
    
    if (weddingId) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('couple_display_name, contact_email')
        .eq('id', weddingId)
        .single()
      
      if (wedding) {
        coupleDisplayName = wedding.couple_display_name || coupleDisplayName
        contactEmail = wedding.contact_email || contactEmail
      }
    }
    
    // Skip rate limiting for now to test email sending
    console.log('Skipping rate limiting check for testing')

    const recipientEmail = emailOverride || invitation.guest.email
    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
    const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

    // Prepare events data
    const events = invitation.invitation_events
      .filter(ie => ie.status === 'accepted' || response === 'accepted')
      .map(ie => ({
        name: ie.event.name,
        startsAtISO: ie.event.starts_at,
        venue: ie.event.venue,
        address: ie.event.address
      }))

    // Generate QR code for email
    let qrAttachment: { filename: string; content: string; contentType: string } | undefined
    try {
      const qrResult = await generateEmailQR(invitation.token)
      qrAttachment = {
        filename: 'qr-code.png',
        content: qrResult.buffer.toString('base64'),
        contentType: 'image/png'
      }
    } catch (error) {
      console.error('Failed to generate QR code for email:', error)
    }

    // Generate digital pass for accepted RSVPs
    let passAttachment: { filename: string; content: string; contentType: string } | undefined
    if (response === 'accepted' && events.length > 0) {
      try {
        const passData: DigitalPassData = {
          guestName,
          inviteCode: invitation.guest.invite_code,
          token: invitation.token,
          events
        }
        const passResult = await generateDigitalPass(passData)
        passAttachment = {
          filename: 'wedding-pass.html',
          content: passResult.base64Content,
          contentType: 'text/html'
        }
      } catch (error) {
        console.error('Failed to generate digital pass:', error)
      }
    }

    // Call edge function to send email
    console.log('Calling send-rsvp-confirmation function for:', recipientEmail)
    console.log('Supabase client configured:', !!supabase)
    console.log('Function name: send-rsvp-confirmation')
    
    const { data, error } = await supabase.functions.invoke('send-rsvp-confirmation', {
      body: {
        to: recipientEmail,
        subject: response === 'accepted' 
          ? `RSVP Confirmed — ${coupleDisplayName}` 
          : `Thank you for your response — ${coupleDisplayName}`,
        html: '', // Will be generated by edge function
        text: '', // Will be generated by edge function
        meta: {
          invitationId: invitation.id,
          rsvpUrl,
          guestName,
          inviteCode: invitation.guest.invite_code,
          events,
          isAccepted: response === 'accepted',
          goodwillMessage,
          coupleDisplayName,
          contactEmail,
          websiteUrl: baseUrl
        },
        attachments: [qrAttachment, passAttachment].filter(Boolean)
      }
    })

    if (error) {
      console.error('Error calling send-rsvp-confirmation function:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return { success: false, message: 'Failed to send confirmation email' }
    }

    console.log('Edge function response:', { data, error })

    // Log successful email send
    await logRsvpConfirmationEmailSend(
      invitation.id,
      recipientEmail,
      events,
      undefined, // user_id
      undefined, // ip_address
      undefined  // user_agent
    )

    return { success: true, message: 'Confirmation email sent successfully' }
  } catch (error) {
    console.error('Error sending RSVP confirmation email:', error)
    return { success: false, message: 'Failed to send confirmation email' }
  }
}

/**
 * Main RSVP submission function
 */
export async function submitRsvp(
  input: RsvpInput,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<{ success: boolean; result?: RsvpResult; message: string }> {
  try {
    // Validate input
    const validatedInput = rsvpSchema.parse(input)
    
    // Validate invite_code and get invitation
    const validationResult = await validateInviteCodeAndGetToken(validatedInput.invite_code)
    if (!validationResult.success || !validationResult.invitation) {
      return { 
        success: false, 
        message: validationResult.error || 'Invalid invite code. Please check your invitation and try again.' 
      }
    }
    
    const invitation = validationResult.invitation

    // Submit to database
    const dbSuccess = await submitRsvpToDatabase(
      invitation,
      validatedInput.response,
      validatedInput.goodwill_message
    )

    if (!dbSuccess) {
      return { 
        success: false, 
        message: 'Failed to save RSVP. Please try again.' 
      }
    }

    // Log RSVP submission
    await logRsvpSubmit(
      invitation.id,
      validatedInput.response,
      user_id,
      ip_address,
      user_agent
    )

    // Log decline message if provided
    if (validatedInput.response === 'declined' && validatedInput.goodwill_message) {
      await logRsvpDeclineMessage(
        invitation.id,
        validatedInput.goodwill_message,
        user_id,
        ip_address,
        user_agent
      )
    }

    // Prepare result
    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
    const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

    const events = invitation.invitation_events
      .filter(ie => ie.status === 'accepted' || validatedInput.response === 'accepted')
      .map(ie => ({
        name: ie.event.name,
        startsAtISO: ie.event.starts_at,
        venue: ie.event.venue,
        address: ie.event.address
      }))

    const result: RsvpResult = {
      status: validatedInput.response,
      guestName,
      events,
      rsvpUrl
    }

    // Generate QR and pass URLs for accepted RSVPs
    if (validatedInput.response === 'accepted' && events.length > 0) {
      try {
        const qrResult = await generateEmailQR(invitation.token)
        result.qrImageUrl = `data:image/png;base64,${qrResult.buffer.toString('base64')}`
        
        const passData: DigitalPassData = {
          guestName,
          inviteCode: invitation.guest.invite_code,
          token: invitation.token,
          events
        }
        const passResult = await generateDigitalPass(passData)
        result.passUrl = passResult.publicUrl
      } catch (error) {
        console.error('Failed to generate QR/pass URLs:', error)
        // Don't fail the RSVP for this
      }
    }

    // Send confirmation email (non-blocking)
    try {
      await sendRsvpConfirmationEmail(
        invitation,
        validatedInput.response,
        validatedInput.email,
        validatedInput.goodwill_message
      )
    } catch (error) {
      console.error('Failed to send confirmation email:', error)
      // Don't fail the RSVP for email issues
    }

    return { 
      success: true, 
      result,
      message: validatedInput.response === 'accepted' 
        ? 'RSVP confirmed! Check your email for details and your digital pass.'
        : 'Thank you for letting us know. We\'ll miss you!'
    }
  } catch (error) {
    console.error('Error in submitRsvp:', error)
    return { 
      success: false, 
      message: 'An unexpected error occurred. Please try again.' 
    }
  }
}
