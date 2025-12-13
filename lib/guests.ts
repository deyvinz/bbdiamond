import { supabaseServer } from './supabase-server'
import { supabase } from './supabase-browser'
import { guestSchema, csvGuestSchema, paginationSchema, guestFiltersSchema } from './validators'
import { Guest, GuestListResponse, GuestFilters, PaginationParams, AuditLog } from './types/guests'
import { CsvRow, downloadCsv, parseCsv } from './csv'
import { bumpNamespaceVersion } from './cache'
import { getWeddingId } from './wedding-context-server'

// Server-side functions
export async function getGuestsServer(
  filters: GuestFilters = {},
  pagination: PaginationParams = { page: 1, page_size: 20 },
  weddingId?: string
) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    // Return empty guests instead of throwing error - allows admin pages to load without wedding context
    console.warn('No wedding ID found, returning empty guests list')
    return {
      guests: [],
      total_count: 0,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: 0
    }
  }
  
  // Debug authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // Test is_admin_or_staff function
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_or_staff')
  
  // Full query with all related data
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
    .eq('wedding_id', resolvedWeddingId)

  // Apply search filter
  if (filters.search) {
    query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`)
  }

  // Apply VIP filter
  if (filters.is_vip !== undefined) {
    query = query.eq('is_vip', filters.is_vip)
  }

  // Note: RSVP status filtering will be handled in application layer after fetching all data

  // Apply sorting
  const sortBy = filters.sort_by || 'name'
  const sortOrder = filters.sort_order || 'asc'
  
  if (sortBy === 'name') {
    query = query.order('last_name', { ascending: sortOrder === 'asc' })
  } else if (sortBy === 'updated_at') {
    query = query.order('updated_at', { ascending: sortOrder === 'asc' })
  }

  // For RSVP status filtering, we need to fetch all data first, then filter, then paginate
  const { data: guests, error, count } = await query

  if (error) {
    console.error('Guest query error details:', error)
    throw new Error(`Failed to fetch guests: ${error.message}`)
  }

  // Process guests to add latest RSVP status and events
  const processedGuests = (guests || []).map((guest: any) => {
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
      // Add all events for this guest, sorted by start date
      all_events: allInvitationEvents
        .map((ie: any) => ({
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
        .sort((a: any, b: any) => 
          new Date(a.event_starts_at || 0).getTime() - new Date(b.event_starts_at || 0).getTime()
        )
    }
  })

  // Apply RSVP status filtering in application layer
  let filteredGuests = processedGuests
  if (filters.rsvp_status) {
    filteredGuests = processedGuests.filter((guest: any) => 
      guest.all_events?.some((event: any) => event.status === filters.rsvp_status)
    )
  }

  // Apply pagination to filtered results
  const from = (pagination.page - 1) * pagination.page_size
  const to = from + pagination.page_size - 1
  const paginatedGuests = filteredGuests.slice(from, to)

  const totalCount = filters.rsvp_status ? filteredGuests.length : (count || 0)
  const totalPages = Math.ceil(totalCount / pagination.page_size)

  return {
    guests: paginatedGuests,
    total_count: totalCount,
    page: pagination.page,
    page_size: pagination.page_size,
    total_pages: totalPages
  } as GuestListResponse
}

/**
 * Get guests who don't have any invitations
 */
export async function getGuestsWithoutInvitations(
  pagination: PaginationParams = { page: 1, page_size: 1000 },
  weddingId?: string
): Promise<GuestListResponse> {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    console.warn('No wedding ID found, returning empty guests list')
    return {
      guests: [],
      total_count: 0,
      page: pagination.page,
      page_size: pagination.page_size,
      total_pages: 0
    }
  }

  // Query guests with a left join to invitations and filter where no invitation exists
  const { data: guests, error, count } = await supabase
    .from('guests')
    .select(`
      *,
      household:households(name),
      invitations(id)
    `, { count: 'exact' })
    .eq('wedding_id', resolvedWeddingId)
    .order('last_name', { ascending: true })

  if (error) {
    console.error('Error fetching guests:', error)
    throw new Error(`Failed to fetch guests: ${error.message}`)
  }

  // Filter to only include guests without invitations
  const guestsWithoutInvitations = (guests || []).filter(
    (guest: Guest & { invitations?: { id: string }[] }) => 
      !guest.invitations || guest.invitations.length === 0
  )

  // Apply pagination
  const from = (pagination.page - 1) * pagination.page_size
  const to = from + pagination.page_size
  const paginatedGuests = guestsWithoutInvitations.slice(from, to)

  const totalCount = guestsWithoutInvitations.length
  const totalPages = Math.ceil(totalCount / pagination.page_size)

  return {
    guests: paginatedGuests,
    total_count: totalCount,
    page: pagination.page,
    page_size: pagination.page_size,
    total_pages: totalPages
  }
}

export async function createGuestServer(guestData: any, invitationData?: any, weddingId?: string) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to create guests')
  }
  
  // Validate input
  const validatedGuest = guestSchema.parse(guestData)
  
  // Create household if needed
  let householdId = validatedGuest.household_id
  if (validatedGuest.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ 
        name: validatedGuest.household_name,
        wedding_id: resolvedWeddingId
      })
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
      household_id: householdId,
      wedding_id: resolvedWeddingId
    })
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to create guest: ${guestError.message}`)
  }

  // Create invitation if specified
  if (invitationData?.event_id) {
    // Import validation function to ensure headcount respects guest's total_guests
    const { validateAndEnforceHeadcount } = await import('./invitations-service')
    
    // Determine initial headcount
    let initialHeadcount = invitationData.headcount || 1
    
    // Validate headcount against guest's total_guests
    const validatedEvents = await validateAndEnforceHeadcount([{
      event_id: invitationData.event_id,
      headcount: initialHeadcount,
      status: 'pending'
    }], guest.total_guests || undefined)
    
    const validatedEvent = validatedEvents[0]
    
    const { error: invitationError } = await supabase
      .from('invitations')
      .insert({
        guest_id: guest.id,
        wedding_id: resolvedWeddingId,
        token: crypto.randomUUID()
      })

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }
    
    // Get the invitation ID
    const { data: invitation } = await supabase
      .from('invitations')
      .select('id')
      .eq('guest_id', guest.id)
      .eq('wedding_id', resolvedWeddingId)
      .single()
    
    if (!invitation) {
      throw new Error('Failed to retrieve created invitation')
    }
    
    // Create invitation_event link with validated headcount
    const { error: invitationEventError } = await supabase
      .from('invitation_events')
      .insert({
        invitation_id: invitation.id,
        event_id: validatedEvent.event_id,
        wedding_id: resolvedWeddingId,
        headcount: validatedEvent.headcount, // Use validated headcount
        status: validatedEvent.status,
        event_token: crypto.randomUUID()
      })

    if (invitationEventError) {
      throw new Error(`Failed to create invitation event: ${invitationEventError.message}`)
    }
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_create', guest.id, 'guest', guest.id, { created: guest })

  return guest
}

export async function updateGuestServer(guestId: string, guestData: any, weddingId?: string) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to update guests')
  }
  
  // Get current guest for audit
  const { data: currentGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .eq('wedding_id', resolvedWeddingId)
    .single()

  // Validate input
  const validatedGuest = guestSchema.parse(guestData)
  
  // Handle household
  let householdId = validatedGuest.household_id
  if (validatedGuest.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ 
        name: validatedGuest.household_name,
        wedding_id: resolvedWeddingId
      })
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
    .eq('id', guestId)
    .eq('wedding_id', resolvedWeddingId)
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to update guest: ${guestError.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_update', guestId, 'guest', guestId, { 
    before: currentGuest, 
    after: guest 
  })

  return guest
}

export async function deleteGuestServer(guestId: string, weddingId?: string) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to delete guests')
  }
  
  // Get guest for audit
  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .eq('wedding_id', resolvedWeddingId)
    .single()

  // Delete guest (cascade will handle invitations/rsvps)
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)
    .eq('wedding_id', resolvedWeddingId)

  if (error) {
    throw new Error(`Failed to delete guest: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAuditAction('guest_delete', guestId, 'guest', guestId, { deleted: guest })

  return true
}

export async function regenerateInvitationToken(guestId: string, eventId: string, weddingId?: string) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required')
  }
  
  const newToken = crypto.randomUUID()
  
  // Find invitation_event to get invitation_id
  const { data: invitationEvent } = await supabase
    .from('invitation_events')
    .select('invitation_id')
    .eq('event_id', eventId)
    .eq('wedding_id', resolvedWeddingId)
    .single()
  
  if (!invitationEvent) {
    throw new Error('Invitation event not found')
  }
  
  const { data: invitation, error } = await supabase
    .from('invitations')
    .update({ token: newToken })
    .eq('id', invitationEvent.invitation_id)
    .eq('guest_id', guestId)
    .eq('wedding_id', resolvedWeddingId)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to regenerate token: ${error.message}`)
  }

  // Log audit
  await logAuditAction('invite_regenerate', guestId, 'invitation', invitation.id, { 
    new_token: newToken 
  })

  return newToken
}

export async function sendInviteEmail(guestId: string, eventId: string, weddingId?: string) {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required')
  }
  
  // Get invitation via invitation_events
  const { data: invitationEvent } = await supabase
    .from('invitation_events')
    .select(`
      invitation_id,
      event:events(name),
      invitation:invitations!inner(
        *,
        guest:guests!inner(email, first_name, last_name)
      )
    `)
    .eq('event_id', eventId)
    .eq('wedding_id', resolvedWeddingId)
    .single()
  
  if (!invitationEvent || !invitationEvent.invitation) {
    throw new Error('Invitation not found')
  }
  
  const invitation = invitationEvent.invitation
  const guest = invitation.guest
  const event = invitationEvent.event

  if (!invitation || !guest || !event) {
    throw new Error('Invitation data incomplete')
  }

  // Check rate limit
  const today = new Date().toISOString().split('T')[0]
  const { data: mailLogs } = await supabase
    .from('mail_logs')
    .select('*')
    .eq('token', invitation.token)
    .eq('wedding_id', resolvedWeddingId)
    .gte('sent_at', `${today}T00:00:00.000Z`)

  if (mailLogs && mailLogs.length >= 3) {
    throw new Error('Daily email limit exceeded for this invitation')
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('send-qr-email', {
    body: {
      token: invitation.token,
      email: guest.email,
      guest_name: `${guest.first_name} ${guest.last_name}`,
      event_name: event.name,
      wedding_id: resolvedWeddingId
    }
  })

  // Log mail attempt
  await supabase
    .from('mail_logs')
    .insert({
      token: invitation.token,
      email: guest.email,
      wedding_id: resolvedWeddingId,
      sent_at: new Date().toISOString(),
      success: !error,
      error_message: error?.message
    })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  // Log audit
  await logAuditAction('invite_email_send', guestId, 'invitation', invitation.id, {
    email: guest.email,
    event: event.name
  })

  return true
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

// Client-side functions
export async function exportGuestsToCsv(guests: Guest[]) {
  const csvData: CsvRow[] = guests.map(guest => ({
    first_name: guest.first_name,
    last_name: guest.last_name,
    email: guest.email || '',
    phone: guest.phone || '',
    is_vip: guest.is_vip ? 'Yes' : 'No',
    gender: guest.gender || '',
    household_name: guest.household?.name || '',
    rsvp_status: guest.latest_rsvp?.status || 'pending'
  }))

  downloadCsv(csvData, `guests-${new Date().toISOString().split('T')[0]}.csv`)
}

export async function importGuestsFromCsv(csvText: string, eventId?: string, weddingId?: string) {
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to import guests')
  }
  
  const rows = parseCsv(csvText)
  const results = {
    created: 0,
    updated: 0,
    errors: [] as string[]
  }

  for (let i = 0; i < rows.length; i++) {
    try {
      const row = csvGuestSchema.parse(rows[i])
      
      // Check if guest exists
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id')
        .eq('email', row.email)
        .eq('wedding_id', resolvedWeddingId)
        .single()

      if (existingGuest) {
        // Update existing guest
        await updateGuestServer(existingGuest.id, row, resolvedWeddingId)
        results.updated++
      } else {
        // Create new guest
        const invitationData = eventId ? { event_id: eventId, headcount: 1 } : undefined
        await createGuestServer(row, invitationData, resolvedWeddingId)
        results.created++
      }
    } catch (error) {
      results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}
