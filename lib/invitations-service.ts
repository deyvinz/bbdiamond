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
import { getAppConfig } from './config-service'
import { getWeddingId } from './wedding-context-server'
import { logger } from './logger'

export interface RsvpGuest {
  id: string
  invitation_event_id: string
  guest_index: number
  name?: string
  food_choice?: string
  created_at: string
  updated_at: string
}

export interface InvitationEvent {
  id: string
  event_id: string
  status: 'pending' | 'accepted' | 'declined' | 'waitlist'
  headcount: number
  event_token: string
  dietary_restrictions?: string
  dietary_information?: string
  food_choice?: string
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
  rsvp_guests?: RsvpGuest[]
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
    phone_number?: string | null
    is_vip: boolean
    invite_code: string
    total_guests?: number
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

// Helper function to validate and enforce headcount rules
// Exported so it can be used in guest creation and other places
export async function validateAndEnforceHeadcount(
  events: Array<{ event_id: string; headcount: number; status: string }>,
  guestTotalGuests?: number
) {
  const config = await getAppConfig()
  
  return events.map(event => {
    let headcount = event.headcount
    
    // If plus-ones are disabled, force headcount to 1
    if (!config.plus_ones_enabled) {
      headcount = 1
    } else {
      // If plus-ones are enabled, enforce limit based on guest's total_guests or config max_party_size
      const configMaxHeadcount = config.max_party_size || 1
      const guestMaxHeadcount = guestTotalGuests || configMaxHeadcount
      const maxHeadcount = Math.min(guestMaxHeadcount, configMaxHeadcount)
      headcount = Math.min(Math.max(headcount, 1), maxHeadcount)
    }
    
    return {
      ...event,
      headcount
    }
  })
}

export async function getInvitationsPage(
  filters: InvitationFiltersInput,
  pagination: { page: number; page_size: number },
  weddingId?: string
): Promise<InvitationsListResponse> {
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to fetch invitations')
  }
  
  // Disable caching for now to fix filtering issues
  // const cacheKey = invitationsListKey({ 
  //   ...filters, 
  //   page: pagination.page,
  //   pageSize: pagination.page_size
  // })
  
  // return await cacheJson(cacheKey, 120, async () => {
  
  const supabase = await supabaseServer()
  
  // Build query
  let query = supabase
    .from('invitations')
    .select(`
      id,
      guest_id,
      token,
      created_at,
      guest:guests!inner(
        id,
        first_name,
        last_name,
        email,
        is_vip,
        invite_code,
        total_guests
      ),
      invitation_events(
        id,
        event_id,
        status,
        headcount,
        event_token,
        dietary_restrictions,
        dietary_information,
        food_choice,
        created_at,
        updated_at,
        event:events(
          id,
          name,
          starts_at,
          venue,
          address
        ),
        rsvp_guests(
          id,
          guest_index,
          name,
          food_choice,
          created_at,
          updated_at
        )
      ).order('event.starts_at', { foreignTable: 'events' })
    `)
    .eq('wedding_id', resolvedWeddingId)

  // Apply filters
  if (filters.q) {
    const searchTerm = `%${filters.q}%`
    // Use proper Supabase JS OR syntax - no dots in the column references inside or()
    query = query.or(
      `first_name.ilike.${searchTerm},` +
      `last_name.ilike.${searchTerm},` +
      `email.ilike.${searchTerm},` +
      `invite_code.ilike.${searchTerm}`,
      { foreignTable: 'guest' }
    )
  }

  if (filters.eventId) {
    query = query.eq('invitation_events.event_id', filters.eventId)
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

  // Get total count with same filters and joins
  let countQuery = supabase
    .from('invitations')
    .select(`
      id,
      guest:guests!inner(
        id,
        first_name,
        last_name,
        email,
        invite_code,
        total_guests
      ),
      invitation_events(
        id,
        event_id,
        status
      )
    `, { count: 'exact', head: true })
    .eq('wedding_id', resolvedWeddingId)

  // Apply same filters to count query
  if (filters.q) {
    const searchTerm = `%${filters.q}%`
    countQuery = countQuery.or(
      `first_name.ilike.${searchTerm},` +
      `last_name.ilike.${searchTerm},` +
      `email.ilike.${searchTerm},` +
      `invite_code.ilike.${searchTerm}`,
      { foreignTable: 'guest' }
    )
  }

  if (filters.eventId) {
    countQuery = countQuery.eq('invitation_events.event_id', filters.eventId)
  }

  // Note: Status filtering is handled in the application layer for count as well

  if (filters.dateFrom) {
    countQuery = countQuery.gte('created_at', filters.dateFrom)
  }

  if (filters.dateTo) {
    countQuery = countQuery.lte('created_at', filters.dateTo)
  }

  // Note: Status filtering will be handled in application layer after fetching all data
  // This ensures we get all invitations with all their events, then filter appropriately

  const { count, error: countError } = await countQuery
  
  if (countError) {
    logger.error('Count query error:', countError)
    logger.error('Count error details:', JSON.stringify(countError, null, 2))
  }

  // For status filtering, we need to fetch all data first, then filter, then paginate
  // This ensures we get all invitations with all their events
  const { data: invitations, error } = await query

  if (error) {
    logger.error('Invitations query error:', error)
    logger.error('Error details:', JSON.stringify(error, null, 2))
    throw new Error(`Failed to fetch invitations: ${error.message || JSON.stringify(error)}`)
  }

  if (!invitations) {
    logger.error('No invitations data returned, but no error either')
    throw new Error('Failed to fetch invitations: No data returned')
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
      .eq('wedding_id', resolvedWeddingId)
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

  // Attach latest RSVP to each invitation event and sort rsvp_guests by guest_index
  const allProcessedInvitations = invitations?.map((invitation: any) => ({
    ...invitation,
    invitation_events: invitation.invitation_events?.map((event: any) => ({
      ...event,
      latest_rsvp: latestRsvps[event.id] || null,
      rsvp_guests: event.rsvp_guests && Array.isArray(event.rsvp_guests)
        ? event.rsvp_guests.sort((a: any, b: any) => (a.guest_index || 0) - (b.guest_index || 0))
        : event.rsvp_guests
    })) || []
  })) || []

  // Apply status filtering in application layer
  let filteredInvitations = allProcessedInvitations
  if (filters.status) {
    filteredInvitations = allProcessedInvitations.filter((invitation: any) => 
      invitation.invitation_events?.some((event: any) => event.status === filters.status)
    )
  }

  // Apply pagination to filtered results
  const offset = (pagination.page - 1) * pagination.page_size
  const processedInvitations = filteredInvitations.slice(offset, offset + pagination.page_size)

  const totalCount = filters.status ? filteredInvitations.length : (count || 0)
  const totalPages = Math.ceil(totalCount / pagination.page_size)

  return {
    invitations: processedInvitations,
    total_count: totalCount,
    page: pagination.page,
    page_size: pagination.page_size,
    total_pages: totalPages
  }
}

export interface CreateInvitationsResult {
  invitations: Invitation[]
  created: number
  skipped: number
  skippedGuestIds: string[]
}

export async function createInvitationsForGuests(
  guestIds: string[],
  eventDefs: Array<{ event_id: string; headcount: number; status: string }>,
  weddingId?: string
): Promise<CreateInvitationsResult> {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to create invitations')
  }
  
  // Validate that all events belong to this wedding (multi-tenant security)
  const eventIds = eventDefs.map(e => e.event_id)
  if (eventIds.length > 0) {
    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select('id, wedding_id')
      .in('id', eventIds)

    if (eventsError) {
      throw new Error(`Failed to verify events: ${eventsError.message}`)
    }

    // Check all events belong to this wedding
    const invalidEvents = events?.filter((e: { id: string; wedding_id: string }) => e.wedding_id !== resolvedWeddingId) || []
    if (invalidEvents.length > 0) {
      throw new Error(`Some events do not belong to this wedding. Access denied.`)
    }

    // Check if all requested events were found
    const foundEventIds = events?.map((e: { id: string; wedding_id: string }) => e.id) || []
    const missingEvents = eventIds.filter(id => !foundEventIds.includes(id))
    if (missingEvents.length > 0) {
      throw new Error(`Some events were not found: ${missingEvents.join(', ')}`)
    }
  }
  
  const invitations: Invitation[] = []
  let createdCount = 0
  let skippedCount = 0
  const skippedGuestIds: string[] = []

  for (const guestId of guestIds) {
    try {
      // Fetch guest info including total_guests (scoped to wedding)
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('invite_code, total_guests, wedding_id')
        .eq('id', guestId)
        .eq('wedding_id', resolvedWeddingId)
        .single()

      if (guestError || !guestData) {
        console.warn(`Skipping guest ${guestId}: ${guestError?.message || 'Guest not found'}`)
        skippedCount++
        skippedGuestIds.push(guestId)
        continue
      }

      const guest = guestData as { invite_code: string | null; total_guests: number | null; wedding_id: string }

      // Additional security check: verify guest belongs to this wedding
      if (guest.wedding_id !== resolvedWeddingId) {
        console.warn(`Skipping guest ${guestId}: Guest does not belong to this wedding`)
        skippedCount++
        skippedGuestIds.push(guestId)
        continue
      }

      // Validate and enforce headcount rules based on guest's total_guests and configuration
      const validatedEventDefs = await validateAndEnforceHeadcount(eventDefs, guest.total_guests || undefined)

      // Generate invite code if missing
      if (!guest.invite_code) {
        const inviteCode = await generateInviteCode()
        const { error: updateError } = await supabase
          .from('guests')
          .update({ invite_code: inviteCode })
          .eq('id', guestId)
          .eq('wedding_id', resolvedWeddingId)

        if (updateError) {
          console.warn(`Skipping guest ${guestId}: Failed to update guest invite code: ${updateError.message}`)
          skippedCount++
          skippedGuestIds.push(guestId)
          continue
        }
      }

      // Check if invitation already exists
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('guest_id', guestId)
        .eq('wedding_id', resolvedWeddingId)
        .single()

      let invitationId: string
      let isNewInvitation = false

      if (existingInvitation) {
        invitationId = existingInvitation.id
      } else {
        // Create new invitation
        const { data: invitation, error: invitationError } = await supabase
          .from('invitations')
          .insert({
            guest_id: guestId,
            wedding_id: resolvedWeddingId,
            token: crypto.randomUUID()
          })
          .select()
          .single()

        if (invitationError) {
          console.warn(`Skipping guest ${guestId}: Failed to create invitation: ${invitationError.message}`)
          skippedCount++
          skippedGuestIds.push(guestId)
          continue
        }

        invitationId = invitation.id
        isNewInvitation = true
      }

      // Check for existing invitation_events to avoid duplicates
      const { data: existingEvents } = await supabase
        .from('invitation_events')
        .select('event_id')
        .eq('invitation_id', invitationId)

      const existingEventIds = existingEvents?.map((e: { event_id: string }) => e.event_id) || []

      // Filter out events that already exist for this invitation
      const newEventDefs = validatedEventDefs.filter(eventDef => !existingEventIds.includes(eventDef.event_id))

      // If all events already exist for this guest, skip
      if (newEventDefs.length === 0 && !isNewInvitation) {
        skippedCount++
        skippedGuestIds.push(guestId)
        // Still fetch and include the invitation for the response
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
              phone_number,
              is_vip,
              invite_code,
              total_guests
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
              ),
              rsvp_guests(
                id,
                guest_index,
                name,
                food_choice,
                created_at,
                updated_at
              ).order('guest_index')
            )
          `)
          .eq('id', invitationId)
          .eq('wedding_id', resolvedWeddingId)
          .single()

        if (fullInvitation) {
          invitations.push(fullInvitation)
        }
        continue
      }

      // Create only new invitation events
      if (newEventDefs.length > 0) {
        const invitationEvents = newEventDefs.map(eventDef => ({
          invitation_id: invitationId,
          event_id: eventDef.event_id,
          wedding_id: resolvedWeddingId,
          headcount: eventDef.headcount,
          status: eventDef.status,
          event_token: crypto.randomUUID()
        }))

        const { error: eventsError } = await supabase
          .from('invitation_events')
          .insert(invitationEvents)

        if (eventsError) {
          console.warn(`Skipping guest ${guestId}: Failed to create invitation events: ${eventsError.message}`)
          skippedCount++
          skippedGuestIds.push(guestId)
          continue
        }
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
            phone_number,
            preferred_contact_method,
            is_vip,
            invite_code,
            total_guests
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
        .eq('wedding_id', resolvedWeddingId)
        .single()

      if (fullInvitation) {
        invitations.push(fullInvitation)
        createdCount++
      }
    } catch (error) {
      console.warn(`Skipping guest ${guestId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      skippedCount++
      skippedGuestIds.push(guestId)
      continue
    }
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_create', {
    wedding_id: resolvedWeddingId,
    guest_count: guestIds.length,
    event_count: eventDefs.length,
    guest_ids: guestIds,
    created_count: createdCount,
    skipped_count: skippedCount
  })

  return {
    invitations,
    created: createdCount,
    skipped: skippedCount,
    skippedGuestIds
  }
}

export async function updateInvitation(
  invitationId: string,
  updates: UpdateInvitationInput,
  weddingId?: string
): Promise<Invitation> {
  const supabase = await supabaseServer()

  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to update invitations')
  }

  // Update guest_id if provided
  if (updates.guest_id) {
    const { error: guestError } = await supabase
      .from('invitations')
      .update({ guest_id: updates.guest_id })
      .eq('id', invitationId)
      .eq('wedding_id', resolvedWeddingId)

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
      .eq('wedding_id', resolvedWeddingId)

    if (deleteError) {
      throw new Error(`Failed to delete existing events: ${deleteError.message}`)
    }

    // Insert new events
    const newEvents = updates.events.map(event => ({
      invitation_id: invitationId,
      event_id: event.event_id,
      wedding_id: resolvedWeddingId,
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
        phone_number,
        preferred_contact_method,
        is_vip,
        invite_code,
        total_guests
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
        ),
        rsvp_guests(
          id,
          guest_index,
          name,
          food_choice,
          created_at,
          updated_at
        )
      )
    `)
    .eq('id', invitationId)
    .eq('wedding_id', resolvedWeddingId)
    .single()

  if (error) {
    throw new Error(`Failed to fetch updated invitation: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_update', {
    wedding_id: resolvedWeddingId,
    invitation_id: invitationId,
    updates
  })

  return invitation
}

export async function deleteInvitations(invitationIds: string[], weddingId?: string): Promise<void> {
  const supabase = await supabaseServer()

  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to delete invitations')
  }

  // Get invitation event IDs first
  const { data: invitationEvents } = await supabase
    .from('invitation_events')
    .select('id')
    .in('invitation_id', invitationIds)
    .eq('wedding_id', resolvedWeddingId)

  const invitationEventIds = invitationEvents?.map((ie: any) => ie.id) || []

  // Delete RSVPs first (if any exist)
  if (invitationEventIds.length > 0) {
    const { error: rsvpsError } = await supabase
      .from('rsvps_v2')
      .delete()
      .in('invitation_event_id', invitationEventIds)
      .eq('wedding_id', resolvedWeddingId)

    if (rsvpsError) {
      logger.warn('Failed to delete RSVPs (may not exist):', rsvpsError.message)
      // Don't throw error for RSVPs as they might not exist
    }
  }

  // Delete invitation_events records
  const { error: eventsError } = await supabase
    .from('invitation_events')
    .delete()
    .in('invitation_id', invitationIds)
    .eq('wedding_id', resolvedWeddingId)

  if (eventsError) {
    throw new Error(`Failed to delete invitation events: ${eventsError.message}`)
  }

  // Finally delete the invitations
  const { error } = await supabase
    .from('invitations')
    .delete()
    .in('id', invitationIds)
    .eq('wedding_id', resolvedWeddingId)

  if (error) {
    throw new Error(`Failed to delete invitations: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_delete', {
    wedding_id: resolvedWeddingId,
    invitation_ids: invitationIds
  })
}

export async function regenerateInviteToken(invitationId: string, weddingId?: string): Promise<string> {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required')
  }
  
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('invitations')
    .update({ token: newToken })
    .eq('id', invitationId)
    .eq('wedding_id', resolvedWeddingId)

  if (error) {
    throw new Error(`Failed to regenerate invite token: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invite_token_regen', {
    wedding_id: resolvedWeddingId,
    invitation_id: invitationId,
    new_token: newToken
  })

  return newToken
}

export async function regenerateEventToken(invitationEventId: string, weddingId?: string): Promise<string> {
  const supabase = await supabaseServer()
  
  // Get wedding ID
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required')
  }
  
  const newToken = crypto.randomUUID()

  const { error } = await supabase
    .from('invitation_events')
    .update({ event_token: newToken })
    .eq('id', invitationEventId)
    .eq('wedding_id', resolvedWeddingId)

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

export interface SendWhatsAppInput {
  invitationId: string
  eventIds: string[]
  phoneNumber: string
  ignoreRateLimit?: boolean
}

export async function sendInviteWhatsApp(params: SendWhatsAppInput): Promise<{ success: boolean; message: string }> {
  const supabase = await supabaseServer()
  
  // Get invitation details
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(phone, first_name, last_name, invite_code, total_guests),
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

  // Validate guest data
  if (!invitation.guest || !invitation.guest.first_name || !invitation.guest.last_name) {
    throw new Error('Guest information is incomplete')
  }

  // Get selected events
  const selectedEvents = invitation.invitation_events?.filter((ie: any) => 
    params.eventIds.includes(ie.event_id)
  ) || []
  
  if (selectedEvents.length === 0) {
    throw new Error('No valid events found for invitation')
  }

  // Get wedding ID
  const weddingId = invitation.wedding_id
  if (!weddingId) {
    throw new Error('Wedding ID not found for invitation')
  }
  
  // Get email config for branding
  const { getEmailConfig, getWebsiteUrl } = await import('./email-service')
  const emailConfigData = weddingId ? await getEmailConfig(weddingId) : null
  const websiteUrl = weddingId ? await getWebsiteUrl(weddingId) : (process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com')
  
  // Prepare data
  const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
  const primaryEvent = selectedEvents[0]
  
  // Validate event data
  if (!primaryEvent.event || !primaryEvent.event.starts_at) {
    throw new Error('Event information is incomplete')
  }
  
  // Format event date and time
  const [datePart, timePart] = primaryEvent.event.starts_at.split(' ')
  const [year, month, day] = datePart.split('-')
  const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const eventTime = timePart ? timePart.substring(0, 5) : '00:00'
  
  const rsvpUrl = `${websiteUrl}/rsvp?token=${invitation.token}`
  const coupleName = emailConfigData?.branding.coupleDisplayName || 'The Couple'

  // Validate required fields before calling edge function
  if (!primaryEvent.event.name || !primaryEvent.event.venue || !invitation.guest.invite_code) {
    throw new Error('Missing required event or guest information')
  }

  // Call edge function to send WhatsApp message
  const { data, error } = await supabase.functions.invoke('send-whatsapp-invite', {
    body: {
      invitationId: params.invitationId,
      weddingId,
      eventIds: params.eventIds,
      phoneNumber: params.phoneNumber,
      guestName,
      coupleName,
      eventName: primaryEvent.event.name,
      eventDate,
      eventTime,
      venue: primaryEvent.event.venue,
      address: primaryEvent.event.address || undefined,
      rsvpUrl,
      inviteCode: invitation.guest.invite_code,
    },
  })

  if (error) {
    logger.error('WhatsApp send error:', error)
    throw new Error(`Failed to send WhatsApp: ${error.message}`)
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to send WhatsApp invitation')
  }

  // Log audit
  await logAdminAction('invite_whatsapp_send', {
    invitation_id: params.invitationId,
    phone_number: params.phoneNumber,
  })

  return {
    success: true,
    message: 'WhatsApp invitation sent successfully',
  }
}

export async function sendInviteEmail(params: SendEmailInput): Promise<{ success: boolean; message: string }> {
  const supabase = await supabaseServer()
  
  // Get invitation details
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(email, first_name, last_name, invite_code, total_guests),
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

  // Determine which event to use
  let event
  // Get selected events
  const selectedEvents = invitation.invitation_events?.filter((ie: any) => 
    params.eventIds.includes(ie.event_id)
  ) || []
  
  if (selectedEvents.length === 0) {
    throw new Error('No valid events found for invitation')
  }

  // Check rate limit (unless ignored)
  if (!params.ignoreRateLimit) {
    const today = new Date().toISOString().split('T')[0]
    const { data: mailLogs } = await supabase
      .from('mail_logs')
      .select('*')
      .eq('token', invitation.token)
      .gte('sent_at', `${today}T00:00:00.000Z`)

    if (mailLogs && mailLogs.length >= 3) {
      logger.log('Daily email limit exceeded for this invitation')
      throw new Error('Daily email limit exceeded for this invitation')
    }
  }

  // Get wedding ID
  const weddingId = invitation.wedding_id
  if (!weddingId) {
    throw new Error('Wedding ID not found for invitation')
  }
  
  // Get email config and branding
  const { getEmailConfig, getWebsiteUrl } = await import('./email-service')
  const emailConfigData = weddingId ? await getEmailConfig(weddingId) : null
  const websiteUrl = weddingId ? await getWebsiteUrl(weddingId) : (process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com')
  
  // Prepare email data
  const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
  
  // For multiple events, use the first event for the main subject and RSVP URL
  const primaryEvent = selectedEvents[0]
    // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
    const [datePart, timePart] = primaryEvent.event.starts_at.split(' ')
    const [year, month, day] = datePart.split('-')
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const eventTime = timePart ? timePart.substring(0, 5) : '00:00' // Extract HH:MM
    const formattedEventDate = `${eventDate} · ${eventTime}`
  
  const rsvpUrl = `${websiteUrl}/rsvp?token=${invitation.token}`
  
  // Generate QR code URL (you can implement this based on your QR generation strategy)
  const qrImageUrl = params.includeQr ? `${websiteUrl}/api/qr?token=${invitation.token}` : undefined

  // Generate .ics attachment for the primary event
  const icsContent = generateIcsAttachment({
    eventName: primaryEvent.event.name,
    startsAt: primaryEvent.event.starts_at,
    venue: primaryEvent.event.venue,
    address: primaryEvent.event.address,
    rsvpUrl,
  })

  // Call edge function with new payload
  const { data, error } = await supabase.functions.invoke('send-qr-email', {
    body: {
      to: params.to || invitation.guest.email,
      subject: `You're Invited, ${invitation.guest.first_name} — ${selectedEvents.length > 1 ? `${selectedEvents.length} Events` : primaryEvent.event.name}`,
      html: '', // Will be generated by edge function
      text: '', // Will be generated by edge function
      meta: {
        invitationId: params.invitationId,
        weddingId: weddingId || undefined,
        eventIds: params.eventIds,
        rsvpUrl,
        guestName,
        inviteCode: invitation.guest.invite_code,
        events: selectedEvents.map((event: any) => ({
          id: event.event_id,
          name: event.event.name,
          startsAtISO: event.event.starts_at,
          venue: event.event.venue,
          address: event.event.address,
        })),
        primaryEvent: {
          id: primaryEvent.event_id,
          name: primaryEvent.event.name,
          startsAtISO: primaryEvent.event.starts_at,
          venue: primaryEvent.event.venue,
          address: primaryEvent.event.address,
        },
        includeQr: params.includeQr || true,
        eventDate: formattedEventDate,
        qrImageUrl,
        coupleDisplayName: emailConfigData?.branding.coupleDisplayName,
        contactEmail: emailConfigData?.branding.contactEmail,
        websiteUrl: websiteUrl,
      },
      attachments: [
        {
          filename: 'event.ics',
          content: icsContent,
          contentType: 'text/calendar',
        },
      ],
    }
  })

  // Log mail attempt
  await supabase
    .from('mail_logs')
    .insert({
      token: invitation.token,
      email: params.to || invitation.guest.email,
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
    event_id: primaryEvent.event_id,
    email: params.to || invitation.guest.email
  })

  return { success: true, message: 'Email sent successfully' }
}

// Helper function to generate .ics attachment
function generateIcsAttachment({
  eventName,
  startsAt,
  venue,
  address,
  rsvpUrl,
}: {
  eventName: string
  startsAt: string
  venue: string
  address?: string
  rsvpUrl: string
}): string {
  // Format for iCal - convert text field to iCal format for all-day events
  const formatDate = (dateString: string) => {
    // Convert "2024-10-16 10:00:00" to "20241016" (date only for all-day events)
    if (!dateString) return '20240101' // Default fallback
    
    const [datePart] = dateString.split(' ')
    if (!datePart) return '20240101' // Safety check
    
    return datePart.replace(/-/g, '') // "2024-10-16" -> "20241016"
  }

  // Calculate next day for DTEND (all-day events end on the next day)
  const getNextDay = (dateString: string) => {
    if (!dateString) return '20240102' // Default fallback
    
    const [datePart] = dateString.split(' ')
    if (!datePart) return '20240102' // Safety check
    
    const [year, month, day] = datePart.split('-').map(Number)
    const nextDay = new Date(year, month - 1, day + 1)
    return `${nextDay.getFullYear()}${String(nextDay.getMonth() + 1).padStart(2, '0')}${String(nextDay.getDate()).padStart(2, '0')}`
  }
  
  const location = address ? `${venue}, ${address}` : venue
  
  // Generate unique UID based on event name and start time
  const eventId = Buffer.from(`${eventName}-${startsAt}`).toString('base64').replace(/[^a-zA-Z0-9]/g, '')
  
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brenda & Diamond//Wedding//EN',
    'BEGIN:VEVENT',
    `UID:${eventId}@brendabagsherdiamond.com`,
    `DTSTAMP:${formatDate(new Date().toISOString().replace('T', ' ').substring(0, 19))}`,
    `DTSTART;VALUE=DATE:${formatDate(startsAt)}`,
    `DTEND;VALUE=DATE:${getNextDay(startsAt)}`,
    `SUMMARY:${eventName}`,
    `LOCATION:${location}`,
    `URL:${rsvpUrl}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')
  
  return Buffer.from(ics).toString('base64')
}

export async function importInvitationsFromCsv(csvData: CsvInvitationInput[]): Promise<{
  success: number
  errors: Array<{ row: number; error: string }>
}> {
  const supabase = await supabaseServer()
  
  // Get wedding_id for multi-tenant support
  const resolvedWeddingId = await getWeddingId()
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to import invitations')
  }
  
  let success = 0
  const errors: Array<{ row: number; error: string }> = []

  for (let i = 0; i < csvData.length; i++) {
    try {
      const row = csvData[i]
      
      // Find or create guest (filtered by wedding_id to prevent cross-tenant conflicts)
      let { data: guest } = await supabase
        .from('guests')
        .select('id, total_guests, wedding_id')
        .eq('email', row.guest_email)
        .eq('wedding_id', resolvedWeddingId)
        .single()

      if (!guest) {
        // Create guest if doesn't exist
        const { data: newGuest, error: guestError } = await supabase
          .from('guests')
          .insert({
            email: row.guest_email,
            first_name: row.guest_first_name || '',
            last_name: row.guest_last_name || '',
            invite_code: crypto.randomUUID().substring(0, 8).toUpperCase(),
            wedding_id: resolvedWeddingId
          })
          .select('id, total_guests')
          .single()

        if (guestError) {
          throw new Error(`Failed to create guest: ${guestError.message}`)
        }
        guest = newGuest
      }

      // Find or create invitation (filtered by wedding_id)
      let { data: invitation } = await supabase
        .from('invitations')
        .select('id')
        .eq('guest_id', guest.id)
        .eq('wedding_id', resolvedWeddingId)
        .single()

      if (!invitation) {
        const { data: newInvitation, error: invitationError } = await supabase
          .from('invitations')
          .insert({
            guest_id: guest.id,
            wedding_id: resolvedWeddingId,
            token: crypto.randomUUID()
          })
          .select('id')
          .single()

        if (invitationError) {
          throw new Error(`Failed to create invitation: ${invitationError.message}`)
        }
        invitation = newInvitation
      }

      // Validate and enforce headcount rules based on guest's total_guests
      const validatedEvents = await validateAndEnforceHeadcount([{
        event_id: row.event_id,
        headcount: row.headcount,
        status: row.status
      }], guest?.total_guests || undefined)
      const validatedEvent = validatedEvents[0]

      // Create or update invitation event (include wedding_id)
      const { error: eventError } = await supabase
        .from('invitation_events')
        .upsert({
          invitation_id: invitation.id,
          event_id: validatedEvent.event_id,
          headcount: validatedEvent.headcount,
          status: validatedEvent.status,
          event_token: crypto.randomUUID(),
          wedding_id: resolvedWeddingId
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
    logger.log(`Invite code ${result} already exists, generating new one...`)
  }
}

// Export types
export type { CreateInvitationInput, UpdateInvitationInput, CsvInvitationInput, SendEmailInput } from './validators'
