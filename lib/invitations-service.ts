import { supabaseServer } from './supabase-server'
import { bumpNamespaceVersion, cacheJson } from './cache'
import { invitationsListKey, invitationDetailKey, invitationsByGuestKey } from './cache-keys'
import { 
  createInvitationSchema, 
  updateInvitationSchema, 
  invitationFiltersSchema,
  csvInvitationSchema,
  sendEmailSchema,
  type CreateInvitationInput,
  type UpdateInvitationInput,
  type InvitationFiltersInput,
  type CsvInvitationInput,
  type SendEmailInput
} from './validators'
import { logAdminAction } from './audit'

export interface InvitationEvent {
  id: string
  event_id: string
  status: 'pending' | 'accepted' | 'declined' | 'waitlist'
  headcount: number
  event_token: string
  created_at: string
  updated_at: string
  event: {
    id: string
    name: string
    starts_at: string
    venue: string
    address?: string
  }
  latest_rsvp?: {
    response: string
    party_size: number
    created_at: string
  }
}

export interface Invitation {
  id: string
  guest_id: string
  token: string
  created_at: string
  guest: {
    id: string
    first_name: string
    last_name: string
    email: string
    is_vip: boolean
    invite_code: string
  }
  invitation_events: InvitationEvent[]
}

export interface InvitationsListResponse {
  invitations: Invitation[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

export async function getInvitationsPage(
  filters: InvitationFiltersInput,
  pagination: { page: number; page_size: number }
): Promise<InvitationsListResponse> {
  const cacheKey = invitationsListKey({ 
    ...filters, 
    page: pagination.page,
    pageSize: pagination.page_size
  })
  
  return await cacheJson(cacheKey, 120, async () => {
  
  const supabase = await supabaseServer()
  
  // Build query
  let query = supabase
    .from('invitations')
    .select(`
      id,
      guest_id,
      token,
      created_at,
      guest:guests(
        id,
        first_name,
        last_name,
        email,
        is_vip,
        invite_code
      ),
      invitation_events(
        id,
        event_id,
        status,
        headcount,
        event_token,
        created_at,
        updated_at,
        event:events(
          id,
          name,
          starts_at,
          venue,
          address
        )
      )
    `)

  // Apply filters
  if (filters.q) {
    query = query.or(`guest.first_name.ilike.%${filters.q}%,guest.last_name.ilike.%${filters.q}%,guest.email.ilike.%${filters.q}%,guest.invite_code.ilike.%${filters.q}%`)
  }

  if (filters.eventId) {
    query = query.eq('invitation_events.event_id', filters.eventId)
  }

  if (filters.status) {
    query = query.eq('invitation_events.status', filters.status)
  }

  if (filters.dateFrom) {
    query = query.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    query = query.lte('created_at', filters.dateTo)
  }

  // Apply sorting
  const sortColumn = filters.sort?.column || 'created_at'
  const sortDirection = filters.sort?.direction || 'desc'
  query = query.order(sortColumn, { ascending: sortDirection === 'asc' })

  // Get total count
  const { count } = await supabase
    .from('invitations')
    .select('*', { count: 'exact', head: true })

  // Apply pagination
  const offset = (pagination.page - 1) * pagination.page_size
  query = query.range(offset, offset + pagination.page_size - 1)

  const { data: invitations, error } = await query

  if (error) {
    console.error('Invitations query error:', error)
    throw new Error(`Failed to fetch invitations: ${error.message}`)
  }

  // Get latest RSVP for each invitation event
  const invitationEventIds = invitations?.flatMap((inv: any) => 
    inv.invitation_events?.map((ie: any) => ie.id) || []
  ) || []

  let latestRsvps: Record<string, any> = {}
  if (invitationEventIds.length > 0) {
    const { data: rsvps } = await supabase
      .from('rsvps_v2')
      .select('invitation_event_id, response, party_size, created_at')
      .in('invitation_event_id', invitationEventIds)
      .order('created_at', { ascending: false })

    if (rsvps) {
      latestRsvps = rsvps.reduce((acc: Record<string, any>, rsvp: any) => {
        if (!acc[rsvp.invitation_event_id]) {
          acc[rsvp.invitation_event_id] = rsvp
        }
        return acc
      }, {} as Record<string, any>)
    }
  }

  // Attach latest RSVP to each invitation event
  const processedInvitations = invitations?.map((invitation: any) => ({
    ...invitation,
    invitation_events: invitation.invitation_events?.map((event: any) => ({
      ...event,
      latest_rsvp: latestRsvps[event.id] || null
    })) || []
  })) || []

  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / pagination.page_size)

    return {
      invitations: processedInvitations,
      total_count: totalCount,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: totalPages
    }
  })
}

export async function createInvitationsForGuests(
  guestIds: string[],
  eventDefs: Array<{ event_id: string; headcount: number; status: string }>
): Promise<Invitation[]> {
  const supabase = await supabaseServer()
  const invitations: Invitation[] = []

  for (const guestId of guestIds) {
    // Ensure guest has an invite code
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('invite_code')
      .eq('id', guestId)
      .single()

    if (guestError) {
      throw new Error(`Failed to fetch guest: ${guestError.message}`)
    }

    // Generate invite code if missing
    if (!guest.invite_code) {
      const inviteCode = await generateInviteCode()
      const { error: updateError } = await supabase
        .from('guests')
        .update({ invite_code: inviteCode })
        .eq('id', guestId)

      if (updateError) {
        throw new Error(`Failed to update guest invite code: ${updateError.message}`)
      }
    }

    // Check if invitation already exists
    const { data: existingInvitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('guest_id', guestId)
      .single()

    let invitationId: string

    if (existingInvitation) {
      invitationId = existingInvitation.id
    } else {
      // Create new invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('invitations')
        .insert({
          guest_id: guestId,
          token: crypto.randomUUID()
        })
        .select()
        .single()

      if (invitationError) {
        throw new Error(`Failed to create invitation: ${invitationError.message}`)
      }

      invitationId = invitation.id
    }

    // Create invitation events
    const invitationEvents = eventDefs.map(eventDef => ({
      invitation_id: invitationId,
      event_id: eventDef.event_id,
      headcount: eventDef.headcount,
      status: eventDef.status,
      event_token: crypto.randomUUID()
    }))

    const { error: eventsError } = await supabase
      .from('invitation_events')
      .insert(invitationEvents)

    if (eventsError) {
      throw new Error(`Failed to create invitation events: ${eventsError.message}`)
    }

    // Fetch the complete invitation
    const { data: fullInvitation } = await supabase
      .from('invitations')
      .select(`
        id,
        guest_id,
        token,
        created_at,
        guest:guests(
          id,
          first_name,
          last_name,
          email,
          is_vip,
          invite_code
        ),
        invitation_events(
          id,
          event_id,
          status,
          headcount,
          event_token,
          created_at,
          updated_at,
          event:events(
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)
      .eq('id', invitationId)
      .single()

    if (fullInvitation) {
      invitations.push(fullInvitation)
    }
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_create', {
    guest_count: guestIds.length,
    event_count: eventDefs.length,
    guest_ids: guestIds
  })

  return invitations
}

export async function updateInvitation(
  invitationId: string,
  updates: UpdateInvitationInput
): Promise<Invitation> {
  const supabase = await supabaseServer()

  // Update guest_id if provided
  if (updates.guest_id) {
    const { error: guestError } = await supabase
      .from('invitations')
      .update({ guest_id: updates.guest_id })
      .eq('id', invitationId)

    if (guestError) {
      throw new Error(`Failed to update invitation guest: ${guestError.message}`)
    }
  }

  // Update events if provided
  if (updates.events) {
    // Delete existing events
    const { error: deleteError } = await supabase
      .from('invitation_events')
      .delete()
      .eq('invitation_id', invitationId)

    if (deleteError) {
      throw new Error(`Failed to delete existing events: ${deleteError.message}`)
    }

    // Insert new events
    const newEvents = updates.events.map(event => ({
      invitation_id: invitationId,
      event_id: event.event_id,
      headcount: event.headcount,
      status: event.status,
      event_token: crypto.randomUUID()
    }))

    const { error: insertError } = await supabase
      .from('invitation_events')
      .insert(newEvents)

    if (insertError) {
      throw new Error(`Failed to insert new events: ${insertError.message}`)
    }
  }

  // Fetch updated invitation
  const { data: invitation, error } = await supabase
    .from('invitations')
    .select(`
      id,
      guest_id,
      token,
      created_at,
      guest:guests(
        id,
        first_name,
        last_name,
        email,
        is_vip,
        invite_code
      ),
      invitation_events(
        id,
        event_id,
        status,
        headcount,
        event_token,
        created_at,
        updated_at,
        event:events(
          id,
          name,
          starts_at,
          venue,
          address
        )
      )
    `)
    .eq('id', invitationId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch updated invitation: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_update', {
    invitation_id: invitationId,
    updates
  })

  return invitation
}

export async function deleteInvitations(invitationIds: string[]): Promise<void> {
  const supabase = await supabaseServer()

  // Get invitation event IDs first
  const { data: invitationEvents } = await supabase
    .from('invitation_events')
    .select('id')
    .in('invitation_id', invitationIds)

  const invitationEventIds = invitationEvents?.map((ie: any) => ie.id) || []

  // Delete RSVPs first (if any exist)
  if (invitationEventIds.length > 0) {
    const { error: rsvpsError } = await supabase
      .from('rsvps_v2')
      .delete()
      .in('invitation_event_id', invitationEventIds)

    if (rsvpsError) {
      console.warn('Failed to delete RSVPs (may not exist):', rsvpsError.message)
      // Don't throw error for RSVPs as they might not exist
    }
  }

  // Delete invitation_events records
  const { error: eventsError } = await supabase
    .from('invitation_events')
    .delete()
    .in('invitation_id', invitationIds)

  if (eventsError) {
    throw new Error(`Failed to delete invitation events: ${eventsError.message}`)
  }

  // Finally delete the invitations
  const { error } = await supabase
    .from('invitations')
    .delete()
    .in('id', invitationIds)

  if (error) {
    throw new Error(`Failed to delete invitations: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_delete', {
    invitation_ids: invitationIds
  })
}

export async function regenerateInviteToken(invitationId: string): Promise<string> {
  const supabase = await supabaseServer()
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('invitations')
    .update({ token: newToken })
    .eq('id', invitationId)

  if (error) {
    throw new Error(`Failed to regenerate invite token: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invite_token_regen', {
    invitation_id: invitationId,
    new_token: newToken
  })

  return newToken
}

export async function regenerateEventToken(invitationEventId: string): Promise<string> {
  const supabase = await supabaseServer()
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('invitation_events')
    .update({ event_token: newToken })
    .eq('id', invitationEventId)

  if (error) {
    throw new Error(`Failed to regenerate event token: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('event_token_regen', {
    invitation_event_id: invitationEventId,
    new_token: newToken
  })

  return newToken
}

export async function sendInviteEmail(params: SendEmailInput): Promise<{ success: boolean; message: string }> {
  const supabase = await supabaseServer()
  
  // Get invitation details
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(email, first_name, last_name),
      invitation_events(
        *,
        event:events(name, starts_at, venue, address)
      )
    `)
    .eq('id', params.invitationId)
    .single()

  if (invitationError || !invitation) {
    throw new Error('Invitation not found')
  }

  const event = invitation.invitation_events?.find((ie: any) => ie.event_id === params.eventId)
  if (!event) {
    throw new Error('Event not found in invitation')
  }

  // Check rate limit
  const today = new Date().toISOString().split('T')[0]
  const { data: mailLogs } = await supabase
    .from('mail_logs')
    .select('*')
    .eq('invitation_id', params.invitationId)
    .gte('sent_at', `${today}T00:00:00.000Z`)

  if (mailLogs && mailLogs.length >= 3) {
    throw new Error('Daily email limit exceeded for this invitation')
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('send-qr-email', {
    body: {
      token: invitation.token,
      eventId: params.eventId,
      email: params.email || invitation.guest.email,
      guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
      event_name: event.event.name
    }
  })

  // Log mail attempt
  await supabase
    .from('mail_logs')
    .insert({
      invitation_id: params.invitationId,
      invitation_event_id: event.id,
      sent_at: new Date().toISOString(),
      success: !error,
      error_message: error?.message
    })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  // Log audit
  await logAdminAction('invite_email_send', {
    invitation_id: params.invitationId,
    event_id: params.eventId,
    email: params.email || invitation.guest.email,
    event_name: event.event.name
  })

  return { success: true, message: 'Invitation email sent successfully' }
}

export async function importInvitationsFromCsv(csvData: CsvInvitationInput[]): Promise<{
  success: number
  errors: Array<{ row: number; error: string }>
}> {
  const supabase = await supabaseServer()
  let success = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < csvData.length; i++) {
    try {
      const row = csvData[i]
      
      // Find or create guest
      let { data: guest } = await supabase
        .from('guests')
        .select('id')
        .eq('email', row.guest_email)
        .single()

      if (!guest) {
        // Create guest if doesn't exist
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            email: row.guest_email,
            first_name: row.guest_first_name || '',
            last_name: row.guest_last_name || '',
            invite_code: crypto.randomUUID().substring(0, 8).toUpperCase()
          })
          .select('id')
          .single()

        if (guestError) {
          throw new Error(`Failed to create guest: ${guestError.message}`)
        }
        guest = newGuest
      }

      // Find or create invitation
      let { data: invitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('guest_id', guest.id)
        .single()

      if (!invitation) {
        const { data: newInvitation, error: invitationError } = await supabase
          .from('invitations')
          .insert({
            guest_id: guest.id,
            token: crypto.randomUUID()
          })
          .select('id')
          .single()

        if (invitationError) {
          throw new Error(`Failed to create invitation: ${invitationError.message}`)
        }
        invitation = newInvitation
      }

      // Create or update invitation event
      const { error: eventError } = await supabase
        .from('invitation_events')
        .upsert({
          invitation_id: invitation.id,
          event_id: row.event_id,
          headcount: row.headcount,
          status: row.status,
          event_token: crypto.randomUUID()
        }, {
          onConflict: 'invitation_id,event_id'
        })

      if (eventError) {
        throw new Error(`Failed to create invitation event: ${eventError.message}`)
      }

      success++
    } catch (error) {
      errors.push({
        row: i + 1,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_csv_import', {
    total_rows: csvData.length,
    success_count: success,
    error_count: errors.length
  })

  return { success, errors }
}

// Generate a unique human-readable invite code
async function generateInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const supabase = await supabaseServer()
  
  while (true) {
    let result = ''
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    
    // Check if code already exists
    const { data: existingGuest } = await supabase
      .from('guests')
      .select('id')
      .eq('invite_code', result)
      .single()
    
    if (!existingGuest) {
      return result
    }
    
    // If code exists, try again
    console.log(`Invite code ${result} already exists, generating new one...`)
  }
}

// Export types
export type { CreateInvitationInput, UpdateInvitationInput, CsvInvitationInput, SendEmailInput } from './validators'
