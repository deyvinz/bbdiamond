import { createClient } from '@supabase/supabase-js'

// Create Supabase client for direct database access
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export interface InvitationData {
  id: string
  token: string
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
    status: string
    headcount: number
    event: {
      id: string
      name: string
      starts_at: string
      venue: string
      address: string
    }
  }>
}

export interface RSVPStatus {
  status: 'accepted' | 'declined' | 'pending'
  guestName: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address: string
  }>
  qrImageUrl?: string
  passUrl?: string
}

/**
 * Resolve invitation by token
 */
export async function resolveInvitationByToken(token: string): Promise<InvitationData | null> {
  try {
    console.log('Resolving invitation by token:', token)
    
    // Find invitation by token
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest_id,
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
      .eq('token', token)
      .single()

    if (invitationError || !invitation) {
      console.log('Invitation not found by token:', { token, invitationError, invitation })
      return null
    }

    // Fetch guest details
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, email, invite_code')
      .eq('id', invitation.guest_id)
      .single()

    if (guestError || !guest) {
      console.log('Guest not found:', guestError)
      return null
    }

    return {
      id: invitation.id,
      token: invitation.token,
      guest,
      invitation_events: (invitation.invitation_events || []).map((ie: any) => ({
        id: ie.id,
        event_id: ie.event_id,
        status: ie.status,
        headcount: ie.headcount,
        event: Array.isArray(ie.event) ? ie.event[0] : ie.event
      }))
    }
  } catch (error) {
    console.error('Error resolving invitation by token:', error)
    return null
  }
}

/**
 * Resolve invitation by invite code
 */
export async function resolveInvitationByInviteCode(inviteCode: string): Promise<InvitationData | null> {
  try {
    console.log('Resolving invitation by invite code:', inviteCode)
    
    // First find the guest by invite code
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, first_name, last_name, email, invite_code')
      .eq('invite_code', inviteCode)
      .single()

    if (guestError || !guest) {
      console.log('Guest not found by invite code:', guestError)
      return null
    }

    // Find invitation for this guest
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest_id,
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
      .eq('guest_id', guest.id)
      .single()

    if (invitationError || !invitation) {
      console.log('Invitation not found for guest:', invitationError)
      return null
    }

    return {
      id: invitation.id,
      token: invitation.token,
      guest,
      invitation_events: (invitation.invitation_events || []).map((ie: any) => ({
        id: ie.id,
        event_id: ie.event_id,
        status: ie.status,
        headcount: ie.headcount,
        event: Array.isArray(ie.event) ? ie.event[0] : ie.event
      }))
    }
  } catch (error) {
    console.error('Error resolving invitation by invite code:', error)
    return null
  }
}

/**
 * Get RSVP status for an invitation
 */
export async function getRSVPStatus(invitationData: InvitationData): Promise<RSVPStatus> {
  try {
    const { invitation_events, guest } = invitationData
    
    // Check if there are any accepted events
    const acceptedEvents = invitation_events.filter(ie => ie.status === 'accepted')
    const declinedEvents = invitation_events.filter(ie => ie.status === 'declined')
    const pendingEvents = invitation_events.filter(ie => ie.status === 'pending')

    // Determine overall status
    let overallStatus: 'accepted' | 'declined' | 'pending' = 'pending'
    if (acceptedEvents.length > 0) {
      overallStatus = 'accepted'
    } else if (declinedEvents.length > 0 && pendingEvents.length === 0) {
      overallStatus = 'declined'
    }

    const guestName = `${guest.first_name} ${guest.last_name}`
    
    // Format events for display
    const events = invitation_events.map(ie => ({
      name: ie.event?.name || 'Event',
      startsAtISO: ie.event?.starts_at || '',
      venue: ie.event?.venue || '',
      address: ie.event?.address || ''
    }))

    // Generate QR code and digital pass for accepted RSVPs (if needed)
    let qrImageUrl: string | undefined
    let passUrl: string | undefined

    if (overallStatus === 'accepted' && acceptedEvents.length > 0) {
      try {
        // You can implement QR/pass generation here if needed
        // For now, we'll skip it to keep it simple
      } catch (error) {
        console.error('Failed to generate QR/pass:', error)
      }
    }

    return {
      status: overallStatus,
      guestName,
      events,
      qrImageUrl,
      passUrl
    }
  } catch (error) {
    console.error('Error getting RSVP status:', error)
    throw error
  }
}

/**
 * Submit RSVP response
 */
export async function submitRSVP(
  invitationId: string,
  eventResponses: Array<{
    event_id: string
    status: 'accepted' | 'declined'
    headcount: number
    goodwill_message?: string
  }>
): Promise<boolean> {
  try {
    console.log('Submitting RSVP:', { invitationId, eventResponses })

    // Update each invitation event
    for (const response of eventResponses) {
      const { error } = await supabase
        .from('invitation_events')
        .update({
          status: response.status,
          headcount: response.headcount,
          goodwill_message: response.goodwill_message || null,
          responded_at: new Date().toISOString()
        })
        .eq('invitation_id', invitationId)
        .eq('event_id', response.event_id)

      if (error) {
        console.error('Error updating invitation event:', error)
        return false
      }
    }

    return true
  } catch (error) {
    console.error('Error submitting RSVP:', error)
    return false
  }
}
