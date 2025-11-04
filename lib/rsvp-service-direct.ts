import { createClient } from '@supabase/supabase-js'
import { getWeddingIdFromClient } from './wedding-context'

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
export async function resolveInvitationByToken(token: string, weddingId?: string): Promise<InvitationData | null> {
  try {
    console.log('Resolving invitation by token:', token)
    
    // Get wedding ID (optional for public RSVP flow, but recommended)
    // Use client-side helper since this can be called from client components
    const resolvedWeddingId = weddingId || getWeddingIdFromClient()
    
    // Find invitation by token
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest_id,
        wedding_id,
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
    
    if (resolvedWeddingId) {
      query = query.eq('wedding_id', resolvedWeddingId)
    }
    
    const { data: invitation, error: invitationError } = await query.single()

    if (invitationError || !invitation) {
      console.log('Invitation not found by token:', { token, invitationError, invitation })
      return null
    }

    // Use wedding_id from invitation if not provided
    const finalWeddingId = resolvedWeddingId || invitation.wedding_id

    // Fetch guest details
    let guestQuery = supabase
      .from('guests')
      .select('id, first_name, last_name, email, invite_code')
      .eq('id', invitation.guest_id)
    
    if (finalWeddingId) {
      guestQuery = guestQuery.eq('wedding_id', finalWeddingId)
    }
    
    const { data: guest, error: guestError } = await guestQuery.single()

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
export async function resolveInvitationByInviteCode(inviteCode: string, weddingId?: string): Promise<InvitationData | null> {
  try {
    console.log('Resolving invitation by invite code:', inviteCode)
    
    // Get wedding ID
    // Use client-side helper since this can be called from client components
    const resolvedWeddingId = weddingId || getWeddingIdFromClient()
    if (!resolvedWeddingId) {
      console.log('No wedding ID available for invite code resolution')
      // Still try without wedding_id for backward compatibility
    }
    
    // First find the guest by invite code
    let guestQuery = supabase
      .from('guests')
      .select('id, first_name, last_name, email, invite_code, wedding_id')
      .eq('invite_code', inviteCode)
    
    if (resolvedWeddingId) {
      guestQuery = guestQuery.eq('wedding_id', resolvedWeddingId)
    }
    
    const { data: guest, error: guestError } = await guestQuery.single()

    if (guestError || !guest) {
      console.log('Guest not found by invite code:', guestError)
      return null
    }

    // Use wedding_id from guest if not provided
    const finalWeddingId = resolvedWeddingId || guest.wedding_id

    // Find invitation for this guest
    let invitationQuery = supabase
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
    
    if (finalWeddingId) {
      invitationQuery = invitationQuery.eq('wedding_id', finalWeddingId)
    }
    
    const { data: invitation, error: invitationError } = await invitationQuery.single()

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
    dietary_restrictions?: string
    dietary_information?: string
    food_choice?: string
  }>
): Promise<boolean> {
  try {
    console.log('Submitting RSVP:', { invitationId, eventResponses })

    // Update each invitation event
    for (const response of eventResponses) {
      const updateData: any = {
        status: response.status,
        headcount: response.headcount,
        goodwill_message: response.goodwill_message || null,
        responded_at: new Date().toISOString()
      }

      // Add dietary and food choice fields if provided (only for accepted)
      if (response.status === 'accepted') {
        if (response.dietary_restrictions !== undefined) {
          updateData.dietary_restrictions = response.dietary_restrictions || null
        }
        if (response.dietary_information !== undefined) {
          updateData.dietary_information = response.dietary_information || null
        }
        if (response.food_choice !== undefined) {
          updateData.food_choice = response.food_choice || null
        }
      } else {
        // Clear dietary/food fields for declined responses
        updateData.dietary_restrictions = null
        updateData.dietary_information = null
        updateData.food_choice = null
      }

      const { error } = await supabase
        .from('invitation_events')
        .update(updateData)
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
