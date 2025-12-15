import { supabaseServer } from './supabase-server'
import { rsvpSchema, type RsvpInput } from './validators'
import { 
  logRsvpSubmit, 
  logRsvpConfirmationEmailSend, 
  logRsvpDeclineMessage 
} from './audit'
import { generateEmailQR } from './qr'
import { generateDigitalPass, type DigitalPassData } from './digital-pass'
import { getWeddingId } from './wedding-context-server'

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
    phone?: string
    invite_code: string
    total_guests?: number
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
    
    // Get wedding ID for multi-tenant support
    const weddingId = await getWeddingId()
    
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        wedding_id,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          phone,
          invite_code,
          wedding_id,
          total_guests
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
    
    // Filter by wedding_id if available (multi-tenant support)
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data, error } = await query.single()

    if (error) {
      console.error('Error resolving invitation:', error)
      return null
    }

    // Additional security check: verify wedding_id matches if both are present
    if (weddingId && data?.wedding_id && data.wedding_id !== weddingId) {
      console.error('Wedding ID mismatch in resolveInvitationByCode')
      return null
    }

    // Verify guest belongs to the same wedding
    const guest = data?.guest as any
    if (weddingId && guest?.wedding_id && guest.wedding_id !== weddingId) {
      console.error('Guest wedding ID mismatch in resolveInvitationByCode')
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
    
    // Get wedding ID for multi-tenant support
    const weddingId = await getWeddingId()
    
    // Look up invitation by guest's invite_code with wedding_id filter
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        wedding_id,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          phone,
          invite_code,
          wedding_id,
          total_guests
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
    
    // Filter by wedding_id if available (multi-tenant support)
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data, error } = await query.single()

    if (error || !data) {
      return {
        success: false,
        error: 'Invalid invite code. Please check your invitation and try again.'
      }
    }

    // Additional security check: verify wedding_id matches if both are present
    if (weddingId && data.wedding_id && data.wedding_id !== weddingId) {
      return {
        success: false,
        error: 'Invalid invite code. Please check your invitation and try again.'
      }
    }

    // Verify guest belongs to the same wedding
    const guest = data.guest as any
    if (weddingId && guest.wedding_id && guest.wedding_id !== weddingId) {
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
  goodwillMessage?: string,
  dietaryData?: {
    dietary_restrictions?: string
    dietary_information?: string
    food_choice?: string
  },
  partySize?: number
): Promise<boolean> {
  try {
    const supabase = await supabaseServer()
    
    // Get wedding ID for multi-tenant verification
    const weddingId = await getWeddingId()
    
    // Verify invitation belongs to the correct wedding (multi-tenant security)
    if (weddingId && invitation.wedding_id && invitation.wedding_id !== weddingId) {
      console.error('Wedding ID mismatch: invitation belongs to different wedding')
      return false
    }
    
    // Use the invitation's wedding_id or the resolved one
    const finalWeddingId = invitation.wedding_id || weddingId
    
    // Get config to validate headcount
    const { getAppConfig } = await import('./config-service')
    const config = await getAppConfig()
    
    // Update each invitation event directly to support dietary fields
    for (const invitationEvent of invitation.invitation_events) {
      // Use provided party_size if available, otherwise preserve existing headcount
      // Validate it against guest's total_guests and config
      let headcount = partySize !== undefined ? partySize : (invitationEvent.headcount || 1)
      
      // If plus-ones are enabled, validate against guest's total_guests
      if (config.plus_ones_enabled && invitation.guest.total_guests) {
        const maxHeadcount = Math.min(
          invitation.guest.total_guests,
          config.max_party_size || invitation.guest.total_guests
        )
        // Ensure headcount doesn't exceed the limit
        headcount = Math.min(headcount, maxHeadcount)
      } else if (!config.plus_ones_enabled) {
        // If plus-ones are disabled, force to 1
        headcount = 1
      }
      
      const updateData: any = {
        status: response,
        headcount,
        // Note: goodwill_message and responded_at are not stored in invitation_events
        // goodwill_message is logged separately via logRsvpDeclineMessage
        // responded_at is tracked via updated_at timestamp
      }

      // Add dietary and food choice fields if provided (only for accepted)
      if (response === 'accepted' && dietaryData) {
        if (dietaryData.dietary_restrictions !== undefined) {
          updateData.dietary_restrictions = dietaryData.dietary_restrictions || null
        }
        if (dietaryData.dietary_information !== undefined) {
          updateData.dietary_information = dietaryData.dietary_information || null
        }
        if (dietaryData.food_choice !== undefined) {
          updateData.food_choice = dietaryData.food_choice || null
        }
      } else if (response === 'declined') {
        // Clear dietary/food fields for declined responses
        updateData.dietary_restrictions = null
        updateData.dietary_information = null
        updateData.food_choice = null
      }

      // Build update query with wedding_id filter for multi-tenant security
      let updateQuery = supabase
        .from('invitation_events')
        .update(updateData)
        .eq('invitation_id', invitation.id)
        .eq('event_id', invitationEvent.event_id)
      
      // Add wedding_id filter if available (multi-tenant security)
      if (finalWeddingId) {
        updateQuery = updateQuery.eq('wedding_id', finalWeddingId)
      }

      const { error } = await updateQuery

      if (error) {
        console.error('Error submitting RSVP for event:', invitationEvent.event.name, error)
        return false
      }

      // Insert record into rsvps_v2 table
      const { error: rsvpError } = await supabase
        .from('rsvps_v2')
        .insert({
          invitation_event_id: invitationEvent.id,
          response: response,
          party_size: headcount,
          message: goodwillMessage || null,
          wedding_id: finalWeddingId,
        })

      if (rsvpError) {
        console.error('Error inserting RSVP into rsvps_v2:', invitationEvent.event.name, rsvpError)
        // Don't return false here - the invitation_events update succeeded
        // Log the error but continue
      }
    }

    return true
  } catch (error) {
    console.error('Error submitting RSVP to database:', error)
    return false
  }
}

/**
 * Send RSVP confirmation via preferred channel (email, SMS, or WhatsApp)
 */
export async function sendRsvpConfirmation(
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  options?: {
    emailOverride?: string
    phoneOverride?: string
    preferredChannel?: 'email' | 'sms' | 'whatsapp'
    goodwillMessage?: string
  }
): Promise<{ success: boolean; message: string; channel?: string }> {
  try {
    const supabase = await supabaseServer()
    
    // Get wedding context for dynamic data
    const weddingId = invitation.wedding_id || await getWeddingId()
    
    // Get email config and branding
    const { getEmailConfig, getWebsiteUrl } = await import('./email-service')
    const { getNotificationConfig, determineBestChannel } = await import('./notification-service')
    
    const emailConfigData = weddingId ? await getEmailConfig(weddingId) : null
    const websiteUrl = weddingId ? await getWebsiteUrl(weddingId) : (process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com')
    
    const coupleDisplayName = emailConfigData?.branding.coupleDisplayName || 'Wedding Celebration'
    const contactEmail = emailConfigData?.branding.contactEmail || 'contact@luwani.com'
    
    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    const rsvpUrl = `${websiteUrl}/rsvp?token=${invitation.token}`

    // Prepare events data
    const events = invitation.invitation_events
      .filter(ie => ie.status === 'accepted' || response === 'accepted')
      .map(ie => ({
        name: ie.event.name,
        startsAtISO: ie.event.starts_at,
        venue: ie.event.venue,
        address: ie.event.address
      }))

    // Determine the best channel to use
    const notificationConfig = weddingId ? await getNotificationConfig(weddingId) : null
    
    // Get contact info - use overrides first, then guest info
    const recipientEmail = options?.emailOverride || invitation.guest.email
    const recipientPhone = options?.phoneOverride || invitation.guest.phone
    
    // Determine which channel to use
    let channelToUse: 'email' | 'sms' | 'whatsapp' | null = null
    
    if (options?.preferredChannel) {
      // User explicitly chose a channel
      channelToUse = options.preferredChannel
    } else if (notificationConfig && weddingId) {
      // Use notification config to determine best channel
      const channelDecision = await determineBestChannel(
        notificationConfig,
        { email: recipientEmail, phone: recipientPhone },
        weddingId
      )
      channelToUse = channelDecision.channel
    } else {
      // Default to email if available
      channelToUse = recipientEmail ? 'email' : (recipientPhone ? 'sms' : null)
    }

    if (!channelToUse) {
      console.warn('[RSVP Confirmation] No channel available - no contact info')
      return { success: false, message: 'No contact information available to send confirmation' }
    }

    console.log('[RSVP Confirmation] Sending via channel:', {
      channel: channelToUse,
      hasEmail: !!recipientEmail,
      hasPhone: !!recipientPhone,
      guestName
    })

    // Send via the determined channel
    if (channelToUse === 'email' && recipientEmail) {
      return await sendRsvpConfirmationViaEmail(
        supabase,
        invitation,
        response,
        recipientEmail,
        {
          guestName,
          rsvpUrl,
          events,
          coupleDisplayName,
          contactEmail,
          websiteUrl,
          weddingId,
          goodwillMessage: options?.goodwillMessage
        }
      )
    } else if ((channelToUse === 'sms' || channelToUse === 'whatsapp') && recipientPhone) {
      return await sendRsvpConfirmationViaSmsOrWhatsapp(
        invitation,
        response,
        recipientPhone,
        channelToUse,
        {
          guestName,
          rsvpUrl,
          events,
          coupleDisplayName,
          websiteUrl,
          weddingId: weddingId || undefined
        }
      )
    }

    return { success: false, message: 'Unable to send confirmation - no valid channel/contact' }
  } catch (error) {
    console.error('Error sending RSVP confirmation:', error)
    return { success: false, message: 'Failed to send confirmation' }
  }
}

/**
 * Send RSVP confirmation via email
 */
async function sendRsvpConfirmationViaEmail(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  recipientEmail: string,
  params: {
    guestName: string
    rsvpUrl: string
    events: Array<{ name: string; startsAtISO: string; venue: string; address?: string }>
    coupleDisplayName: string
    contactEmail: string
    websiteUrl: string
    weddingId: string | null
    goodwillMessage?: string
  }
): Promise<{ success: boolean; message: string; channel?: string }> {
  try {
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
    if (response === 'accepted' && params.events.length > 0) {
      try {
        const passData: DigitalPassData = {
          guestName: params.guestName,
          inviteCode: invitation.guest.invite_code,
          token: invitation.token,
          events: params.events
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
    const { error } = await supabase.functions.invoke('send-rsvp-confirmation', {
      body: {
        to: recipientEmail,
        subject: response === 'accepted' 
          ? `RSVP Confirmed — ${params.coupleDisplayName}` 
          : `Thank you for your response — ${params.coupleDisplayName}`,
        html: '',
        text: '',
        meta: {
          invitationId: invitation.id,
          weddingId: params.weddingId || undefined,
          rsvpUrl: params.rsvpUrl,
          guestName: params.guestName,
          inviteCode: invitation.guest.invite_code,
          events: params.events,
          isAccepted: response === 'accepted',
          goodwillMessage: params.goodwillMessage,
          coupleDisplayName: params.coupleDisplayName,
          contactEmail: params.contactEmail,
          websiteUrl: params.websiteUrl
        },
        attachments: [qrAttachment, passAttachment].filter(Boolean)
      }
    })

    if (error) {
      console.error('Error calling send-rsvp-confirmation function:', error)
      return { success: false, message: 'Failed to send confirmation email', channel: 'email' }
    }

    // Log successful email send
    await logRsvpConfirmationEmailSend(
      invitation.id,
      recipientEmail,
      params.events,
      undefined,
      undefined,
      undefined
    )

    return { success: true, message: 'Confirmation email sent successfully', channel: 'email' }
  } catch (error) {
    console.error('Error sending RSVP confirmation email:', error)
    return { success: false, message: 'Failed to send confirmation email', channel: 'email' }
  }
}

/**
 * Send RSVP confirmation via SMS or WhatsApp using NotificationAPI
 */
async function sendRsvpConfirmationViaSmsOrWhatsapp(
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  recipientPhone: string,
  channel: 'sms' | 'whatsapp',
  params: {
    guestName: string
    rsvpUrl: string
    events: Array<{ name: string; startsAtISO: string; venue: string; address?: string }>
    coupleDisplayName: string
    websiteUrl: string
    weddingId?: string
  }
): Promise<{ success: boolean; message: string; channel?: string }> {
  try {
    const { 
      sendNotification: sendNotificationAPI, 
      isNotificationAPIConfigured,
      getWeddingThemeParams,
      mapRsvpConfirmationToMergeTags
    } = await import('./notificationapi-service')

    // Check if NotificationAPI is configured
    if (!isNotificationAPIConfigured()) {
      console.warn('[RSVP Confirmation] NotificationAPI not configured for SMS/WhatsApp')
      return { success: false, message: `NotificationAPI not configured for ${channel}`, channel }
    }

    // Get theme params for branding
    const theme = params.weddingId ? await getWeddingThemeParams(params.weddingId) : undefined

    // Format event date/time for the first event
    const primaryEvent = params.events[0]
    let eventDate = ''
    let eventTime = ''
    
    if (primaryEvent) {
      const [datePart, timePart] = primaryEvent.startsAtISO.split(' ')
      const [year, month, day] = datePart.split('-')
      eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      eventTime = timePart ? timePart.substring(0, 5) : ''
    }

    // Build merge tags
    const mergeTags = mapRsvpConfirmationToMergeTags({
      guestName: params.guestName,
      coupleName: params.coupleDisplayName,
      eventName: primaryEvent?.name || 'Wedding',
      rsvpStatus: response === 'accepted' ? 'Confirmed' : 'Declined',
      guestCount: 1,
      eventDate,
      eventTime,
      venue: primaryEvent?.venue || '',
      address: primaryEvent?.address,
      rsvpUrl: params.rsvpUrl,
      websiteUrl: params.websiteUrl,
      theme
    })

    // Send via NotificationAPI
    const result = await sendNotificationAPI({
      type: 'rsvp_confirmation',
      userId: recipientPhone,
      phone: recipientPhone,
      parameters: mergeTags,
      weddingId: params.weddingId,
      channel
    })

    if (result.success) {
      console.log(`[RSVP Confirmation] ${channel.toUpperCase()} sent successfully`)
      return { 
        success: true, 
        message: `Confirmation sent via ${channel === 'sms' ? 'SMS' : 'WhatsApp'}`,
        channel 
      }
    } else {
      console.error(`[RSVP Confirmation] ${channel.toUpperCase()} failed:`, result.error)
      return { success: false, message: result.error || `Failed to send ${channel}`, channel }
    }
  } catch (error) {
    console.error(`Error sending RSVP confirmation via ${channel}:`, error)
    return { success: false, message: `Failed to send confirmation via ${channel}`, channel }
  }
}

/**
 * Send RSVP confirmation email (legacy - calls sendRsvpConfirmation)
 */
export async function sendRsvpConfirmationEmail(
  invitation: InvitationWithEvents,
  response: 'accepted' | 'declined',
  emailOverride?: string,
  goodwillMessage?: string
): Promise<{ success: boolean; message: string }> {
  return sendRsvpConfirmation(invitation, response, {
    emailOverride,
    preferredChannel: 'email',
    goodwillMessage
  })
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
    
    // Additional multi-tenant security check: verify wedding_id matches
    const weddingId = await getWeddingId()
    if (weddingId && invitation.wedding_id && invitation.wedding_id !== weddingId) {
      return {
        success: false,
        message: 'Invalid invite code. Please check your invitation and try again.'
      }
    }

    // Submit to database
    const dbSuccess = await submitRsvpToDatabase(
      invitation,
      validatedInput.response,
      validatedInput.goodwill_message,
      validatedInput.response === 'accepted' ? {
        dietary_restrictions: validatedInput.dietary_restrictions,
        dietary_information: validatedInput.dietary_information,
        food_choice: validatedInput.food_choice
      } : undefined,
      validatedInput.party_size
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

    // Send confirmation via preferred channel (non-blocking)
    try {
      const confirmResult = await sendRsvpConfirmation(
        invitation,
        validatedInput.response,
        {
          emailOverride: validatedInput.email,
          phoneOverride: validatedInput.phone,
          preferredChannel: validatedInput.preferred_channel,
          goodwillMessage: validatedInput.goodwill_message
        }
      )
      console.log('[RSVP] Confirmation sent:', confirmResult)
    } catch (error) {
      console.error('Failed to send confirmation:', error)
      // Don't fail the RSVP for notification issues
    }

    // Build success message based on available contact info
    const hasContactInfo = validatedInput.email || validatedInput.phone || invitation.guest.email || invitation.guest.phone
    const successMessage = validatedInput.response === 'accepted' 
      ? hasContactInfo 
        ? 'RSVP confirmed! Check your email or phone for details and your digital pass.'
        : 'RSVP confirmed! We look forward to seeing you.'
      : 'Thank you for letting us know. We\'ll miss you!'

    return { 
      success: true, 
      result,
      message: successMessage
    }
  } catch (error) {
    console.error('Error in submitRsvp:', error)
    return { 
      success: false, 
      message: 'An unexpected error occurred. Please try again.' 
    }
  }
}
