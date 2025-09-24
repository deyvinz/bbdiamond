import { supabaseServer } from './supabase-server'
import { supabase } from './supabase-browser'
import { guestSchema, csvGuestSchema, paginationSchema, guestFiltersSchema } from './validators'
import { Guest, GuestListResponse, GuestFilters, PaginationParams, AuditLog } from './types/guests'
import { CsvRow, downloadCsv, parseCsv } from './csv'

// Server-side functions
export async function getGuestsServer(
  filters: GuestFilters = {},
  pagination: PaginationParams = { page: 1, page_size: 20 }
) {
  const supabase = await supabaseServer()
  
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

  // Filter by RSVP status if specified
  let filteredGuests = processedGuests
  if (filters.rsvp_status) {
    filteredGuests = processedGuests.filter((guest: any) => 
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

export async function createGuestServer(guestData: any, invitationData?: any) {
  const supabase = await supabaseServer()
  
  // Validate input
  const validatedGuest = guestSchema.parse(guestData)
  
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

  // Create invitation if specified
  if (invitationData?.event_id) {
    const { error: invitationError } = await supabase
      .from('invitations')
      .insert({
        guest_id: guest.id,
        event_id: invitationData.event_id,
        headcount: invitationData.headcount || 1,
        token: crypto.randomUUID()
      })

    if (invitationError) {
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }
  }

  // Log audit
  await logAuditAction('guest_create', guest.id, 'guest', guest.id, { created: guest })

  return guest
}

export async function updateGuestServer(guestId: string, guestData: any) {
  const supabase = await supabaseServer()
  
  // Get current guest for audit
  const { data: currentGuest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .single()

  // Validate input
  const validatedGuest = guestSchema.parse(guestData)
  
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
    .eq('id', guestId)
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to update guest: ${guestError.message}`)
  }

  // Log audit
  await logAuditAction('guest_update', guestId, 'guest', guestId, { 
    before: currentGuest, 
    after: guest 
  })

  return guest
}

export async function deleteGuestServer(guestId: string) {
  const supabase = await supabaseServer()
  
  // Get guest for audit
  const { data: guest } = await supabase
    .from('guests')
    .select('*')
    .eq('id', guestId)
    .single()

  // Delete guest (cascade will handle invitations/rsvps)
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)

  if (error) {
    throw new Error(`Failed to delete guest: ${error.message}`)
  }

  // Log audit
  await logAuditAction('guest_delete', guestId, 'guest', guestId, { deleted: guest })

  return true
}

export async function regenerateInvitationToken(guestId: string, eventId: string) {
  const supabase = await supabaseServer()
  
  const newToken = crypto.randomUUID()
  
  const { data: invitation, error } = await supabase
    .from('invitations')
    .update({ token: newToken })
    .eq('guest_id', guestId)
    .eq('event_id', eventId)
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

export async function sendInviteEmail(guestId: string, eventId: string) {
  const supabase = await supabaseServer()
  
  // Get invitation
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(email, first_name, last_name),
      event:events(name)
    `)
    .eq('guest_id', guestId)
    .eq('event_id', eventId)
    .single()

  if (invitationError || !invitation) {
    throw new Error('Invitation not found')
  }

  // Check rate limit
  const today = new Date().toISOString().split('T')[0]
  const { data: mailLogs } = await supabase
    .from('mail_logs')
    .select('*')
    .eq('token', invitation.token)
    .gte('sent_at', `${today}T00:00:00.000Z`)

  if (mailLogs && mailLogs.length >= 3) {
    throw new Error('Daily email limit exceeded for this invitation')
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('send-qr-email', {
    body: {
      token: invitation.token,
      email: invitation.guest.email,
      guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
      event_name: invitation.event.name
    }
  })

  // Log mail attempt
  await supabase
    .from('mail_logs')
    .insert({
      token: invitation.token,
      email: invitation.guest.email,
      sent_at: new Date().toISOString(),
      success: !error,
      error_message: error?.message
    })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  // Log audit
  await logAuditAction('invite_email_send', guestId, 'invitation', invitation.id, {
    email: invitation.guest.email,
    event: invitation.event.name
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
    email: guest.email,
    phone: guest.phone || '',
    is_vip: guest.is_vip ? 'Yes' : 'No',
    gender: guest.gender || '',
    household_name: guest.household?.name || '',
    rsvp_status: guest.latest_rsvp?.status || 'pending'
  }))

  downloadCsv(csvData, `guests-${new Date().toISOString().split('T')[0]}.csv`)
}

export async function importGuestsFromCsv(csvText: string, eventId?: string) {
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
        .single()

      if (existingGuest) {
        // Update existing guest
        await updateGuestServer(existingGuest.id, row)
        results.updated++
      } else {
        // Create new guest
        const invitationData = eventId ? { event_id: eventId, headcount: 1 } : undefined
        await createGuestServer(row, invitationData)
        results.created++
      }
    } catch (error) {
      results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return results
}
