import { supabaseServer } from './supabase-server'
import { cacheJson, invalidateKeys, bumpNamespaceVersion, getCacheConfig } from './cache'
import { guestsListKey, guestDetailKey, getCommonGuestListKeys } from './cache-keys'
import { GuestListResponse, GuestFilters, PaginationParams, Guest } from './types/guests'
import { guestSchema } from './validators'

const config = getCacheConfig()

export interface GuestsListParams {
  page: number
  pageSize: number
  q?: string
  status?: string
  vip?: boolean
  sort?: {
    column: string
    direction: 'asc' | 'desc'
  }
}

export async function getGuestsPage(params: GuestsListParams): Promise<GuestListResponse> {
  const key = guestsListKey(params)
  
  return await cacheJson(
    key,
    config.guestsTtl,
    async () => {
      const supabase = await supabaseServer()
      
      // Convert params to the format expected by getGuestsServer
      const filters: GuestFilters = {
        search: params.q,
        rsvp_status: params.status as 'pending' | 'accepted' | 'declined' | 'waitlist' | undefined,
        is_vip: params.vip,
        sort_by: params.sort?.column === 'name' ? 'name' : 'updated_at',
        sort_order: params.sort?.direction || 'asc'
      }
      
      const pagination: PaginationParams = {
        page: params.page,
        page_size: params.pageSize
      }
      
      // Use the existing getGuestsServer logic but inline it to avoid circular imports
      let query = supabase
        .from('guests')
        .select(`
          *,
          household:households(name),
          invitations(
            id, token, created_at,
            invitation_events(
              id, event_id, status, headcount, event_token, created_at,
              event:events(name, starts_at, venue, address),
              rsvps_v2(response, party_size, message, created_at)
            )
          )
        `, { count: 'exact' })

      // Apply search filter
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
      }

      // Apply VIP filter
      if (filters.is_vip !== undefined) {
        query = query.eq('is_vip', filters.is_vip)
      }

      // Apply sorting
      const sortBy = filters.sort_by || 'name'
      const sortOrder = filters.sort_order || 'asc'
      
      if (sortBy === 'name') {
        query = query.order('last_name', { ascending: sortOrder === 'asc' })
      } else if (sortBy === 'updated_at') {
        query = query.order('updated_at', { ascending: sortOrder === 'asc' })
      }

      // Apply pagination
      const from = (pagination.page - 1) * pagination.page_size
      const to = from + pagination.page_size - 1
      query = query.range(from, to)

      const { data: guests, error, count } = await query

      if (error) {
        throw new Error(`Failed to fetch guests: ${error.message}`)
      }

      // Process guests to add latest RSVP status and events
      const processedGuests = (guests || []).map(guest => {
        // Get all invitation events from all invitations
        const allInvitationEvents = guest.invitations?.flatMap((inv: any) => inv.invitation_events || []) || []
        
        // Get all RSVPs from all invitation events
        const allRsvps = allInvitationEvents.flatMap((ie: any) => ie.rsvps_v2 || [])
        
        // Find the latest RSVP across all invitation events
        const latestRsvp = allRsvps
          .sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )[0]
        
        return {
          ...guest,
          latest_rsvp: latestRsvp ? {
            status: latestRsvp.response,
            created_at: latestRsvp.created_at,
            party_size: latestRsvp.party_size,
            message: latestRsvp.message
          } : undefined,
          // Add all events for this guest
          all_events: allInvitationEvents.map((ie: any) => ({
            event_id: ie.event_id,
            event_name: ie.event?.name || 'Unknown Event',
            event_starts_at: ie.event?.starts_at,
            event_venue: ie.event?.venue,
            event_address: ie.event?.address,
            status: ie.status,
            headcount: ie.headcount,
            event_token: ie.event_token,
            created_at: ie.created_at,
            rsvps: ie.rsvps_v2 || []
          }))
        }
      })

      // Filter by RSVP status if specified
      let filteredGuests = processedGuests
      if (filters.rsvp_status) {
        filteredGuests = processedGuests.filter(guest => 
          guest.latest_rsvp?.status === filters.rsvp_status
        )
      }

      const totalCount = (filters.rsvp_status ? filteredGuests.length : (count || 0))
      const totalPages = Math.ceil(totalCount / pagination.page_size)

      return {
        guests: filteredGuests,
        total_count: totalCount,
        page: pagination.page,
        page_size: pagination.page_size,
        total_pages: totalPages
      } as GuestListResponse
    }
  )
}

export async function createGuest(input: any): Promise<Guest> {
  const supabase = await supabaseServer()
  
  // Validate input
  const validatedGuest = guestSchema.parse(input)
  
  // Create household if needed
  let householdId = validatedGuest.household_id
  if (validatedGuest.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: validatedGuest.household_name })
      .select()
      .single()
    
    if (householdError) {
      throw new Error(`Failed to create household: ${householdError.message}`)
    }
    householdId = household.id
  }

  // Create guest
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .insert({
      ...validatedGuest,
      household_id: householdId
    })
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to create guest: ${guestError.message}`)
  }

  // Invalidate cache - use version bump for simplicity
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_create', guest.id, 'guest', guest.id, { created: guest })

  return guest
}

export async function updateGuest(id: string, patch: any): Promise<Guest> {
  const supabase = await supabaseServer()
  
  // Get current guest for audit
  const { data: currentGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single()

  // Validate input
  const validatedGuest = guestSchema.parse(patch)
  
  // Handle household
  let householdId = validatedGuest.household_id
  if (validatedGuest.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: validatedGuest.household_name })
      .select()
      .single()
    
    if (householdError) {
      throw new Error(`Failed to create household: ${householdError.message}`)
    }
    householdId = household.id
  }

  // Update guest
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .update({
      ...validatedGuest,
      household_id: householdId,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to update guest: ${guestError.message}`)
  }

  // Invalidate cache - use version bump for simplicity
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_update', id, 'guest', id, { 
    before: currentGuest, 
    after: guest 
  })

  return guest
}

export async function deleteGuest(id: string): Promise<boolean> {
  const supabase = await supabaseServer()
  
  // Get guest for audit
  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', id)
    .single()

  // Delete guest (cascade will handle invitations/rsvps)
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete guest: ${error.message}`)
  }

  // Invalidate cache - use version bump for simplicity
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_delete', id, 'guest', id, { deleted: guest })

  return true
}

export async function createInvitationForGuest(
  guestId: string, 
  eventId: string, 
  headcount: number = 1
): Promise<any> {
  const supabase = await supabaseServer()
  
  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      guest_id: guestId,
      event_id: eventId,
      headcount,
      token: crypto.randomUUID()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create invitation: ${error.message}`)
  }

  // Invalidate cache - use version bump for simplicity
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('invitation_create', guestId, 'invitation', invitation.id, { 
    event_id: eventId,
    headcount 
  })

  return invitation
}

export async function updateInvitationEvent(
  invitationEventId: string,
  updates: { status?: string; headcount?: number }
): Promise<any> {
  const supabase = await supabaseServer()
  
  const { data: invitationEvent, error } = await supabase
    .from('invitation_events')
    .update(updates)
    .eq('id', invitationEventId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to update invitation event: ${error.message}`)
  }

  // Invalidate cache - use version bump for simplicity
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('invitation_event_update', invitationEventId, 'invitation_event', invitationEventId, updates)

  return invitationEvent
}

export async function bulkInvalidateGuests(): Promise<void> {
  // For bulk operations like CSV import, bump the global version
  await bumpNamespaceVersion()
}

async function logAuditAction(
  action: string,
  actorId: string,
  entity: string,
  entityId: string,
  delta?: any
) {
  const supabase = await supabaseServer()
  
  await supabase
    .from('admin_audit_logs')
    .insert({
      action,
      actor_id: actorId,
      entity,
      entity_id: entityId,
      delta,
      created_at: new Date().toISOString()
    })
}
