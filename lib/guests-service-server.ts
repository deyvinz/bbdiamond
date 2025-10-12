import { GuestListResponse, Guest } from './types/guests'
import { supabaseServer } from './supabase-server'
import { bumpNamespaceVersion } from './cache'
import { logInviteCodeBackfill, logAdminAction } from './audit'
import { guestSchema } from './validators'

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
  // This function is not used in server-side context
  // The actual data fetching is done in the page component
  throw new Error('getGuestsPage should not be called on server-side')
}

export async function createGuest(input: Partial<Guest>): Promise<Guest> {
  const supabase = await supabaseServer()

  // Validate input
  let validatedGuest
  try {
    validatedGuest = guestSchema.parse(input)
  } catch (error) {
    console.error('Validation error:', error)
    throw error
  }

  // Check for duplicate email (case-insensitive)
  if (validatedGuest.email) {
    const { data: existingGuest, error: checkError } = await supabase
      .from('guests')
      .select('id, email, first_name, last_name')
      .ilike('email', validatedGuest.email)
      .single()

    if (existingGuest && !checkError) {
      throw new Error(
        `A guest with email "${existingGuest.email}" already exists: ${existingGuest.first_name} ${existingGuest.last_name}`
      )
    }
  }

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

  // Generate invite code
  const inviteCode = await generateInviteCode()

  // Create guest
  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .insert({
      first_name: validatedGuest.first_name,
      last_name: validatedGuest.last_name,
      email: validatedGuest.email,
      phone: validatedGuest.phone,
      household_id: householdId,
      is_vip: validatedGuest.is_vip,
      gender: validatedGuest.gender,
      invite_code: inviteCode
    })
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    throw new Error(`Failed to create guest: ${guestError.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('guest_create', {
    guest_id: guest.id,
    guest_name: `${guest.first_name} ${guest.last_name}`,
    guest_email: guest.email
  })

  return guest
}

export async function updateGuest(id: string, input: Partial<Guest>): Promise<Guest> {
  const supabase = await supabaseServer()

  // Validate input
  let validatedUpdates
  try {
    validatedUpdates = guestSchema.partial().parse(input)
  } catch (error) {
    console.error('Validation error:', error)
    throw error
  }

  // Handle household creation/assignment
  let householdId: string | null = validatedUpdates.household_id || null
  if (validatedUpdates.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: validatedUpdates.household_name })
      .select()
      .single()

    if (householdError) {
      throw new Error(`Failed to create household: ${householdError.message}`)
    }
    householdId = household.id
  } else if (validatedUpdates.household_id === 'none') {
    householdId = null
  }

  const { data: guest, error } = await supabase
    .from('guests')
    .update({
      ...validatedUpdates,
      household_id: householdId,
      household_name: undefined,
    })
    .eq('id', id)
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (error) {
    throw new Error(`Failed to update guest: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('guest_update', {
    guest_id: guest.id,
    guest_name: `${guest.first_name} ${guest.last_name}`,
    guest_email: guest.email,
    updated_fields: Object.keys(validatedUpdates)
  })

  return guest
}

export async function deleteGuest(id: string): Promise<boolean> {
  const supabase = await supabaseServer()

  // Delete related invitations first
  const { error: deleteInvitationsError } = await supabase
    .from('invitations')
    .delete()
    .eq('guest_id', id)

  if (deleteInvitationsError) {
    throw new Error(`Failed to delete invitations for guest: ${deleteInvitationsError.message}`)
  }

  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', id)

  if (error) {
    throw new Error(`Failed to delete guest: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('guest_delete', {
    guest_id: id
  })

  return true
}

export async function createInvitationForGuest(
  guestId: string, 
  eventId: string
): Promise<{ id: string; token: string; created_at: string }> {
  const supabase = await supabaseServer()

  // Check if invitation already exists
  const { data: existingInvitation } = await supabase
    .from('invitations')
    .select('id, token, created_at')
    .eq('guest_id', guestId)
    .single()

  if (existingInvitation) {
    // Check if invitation event already exists
    const { data: existingEvent } = await supabase
      .from('invitation_events')
      .select('id')
      .eq('invitation_id', existingInvitation.id)
      .eq('event_id', eventId)
      .single()

    if (!existingEvent) {
      // Create invitation event
      const { error: eventError } = await supabase
        .from('invitation_events')
        .insert({
          invitation_id: existingInvitation.id,
          event_id: eventId,
          headcount: 1,
          status: 'pending',
          event_token: crypto.randomUUID()
        })

      if (eventError) {
        throw new Error(`Failed to create invitation event: ${eventError.message}`)
      }
    }

    return {
      id: existingInvitation.id,
      token: existingInvitation.token,
      created_at: existingInvitation.created_at
    }
  }

  // Create new invitation
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .insert({
      guest_id: guestId,
      token: crypto.randomUUID()
    })
    .select('id, token, created_at')
    .single()

  if (invitationError) {
    throw new Error(`Failed to create invitation: ${invitationError.message}`)
  }

  // Create invitation event
  const { error: eventError } = await supabase
    .from('invitation_events')
    .insert({
      invitation_id: invitation.id,
      event_id: eventId,
      headcount: 1,
      status: 'pending',
      event_token: crypto.randomUUID()
    })

  if (eventError) {
    throw new Error(`Failed to create invitation event: ${eventError.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('invitation_create', {
    guest_id: guestId,
    event_id: eventId,
    invitation_id: invitation.id
  })

  return {
    id: invitation.id,
    token: invitation.token,
    created_at: invitation.created_at
  }
}

export async function bulkInvalidateGuests(): Promise<void> {
  // For bulk operations like CSV import, this is handled server-side
  // No client-side action needed
}

// Generate a unique human-readable invite code (server-side version)
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

export interface GuestMissingCode {
  id: string
  email: string
  first_name: string
  last_name: string
}

export interface BackfillResult {
  updated: number
  skipped: number
  conflictsResolved: number
  rows: Array<{
    guest_id: string
    email: string
    invite_code: string
    retries: number
    status: 'success' | 'skipped' | 'error'
    error?: string
  }>
}

export async function scanGuestsMissingInviteCode(limit: number): Promise<GuestMissingCode[]> {
  const supabase = await supabaseServer()
  
  const { data, error } = await supabase
    .from('guests')
    .select('id, email, first_name, last_name')
    .is('invite_code', null)
    .limit(limit)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to scan guests: ${error.message}`)
  }

  return data || []
}

export async function setGuestInviteCode(
  guestId: string, 
  code: string, 
  maxRetries: number = 5
): Promise<{ success: boolean; retries: number; error?: string }> {
  const supabase = await supabaseServer()
  let retries = 0
  let lastError: string | undefined

  while (retries < maxRetries) {
    try {
      const { error } = await supabase
        .from('guests')
        .update({ invite_code: code })
        .eq('id', guestId)
        .is('invite_code', null) // Only update if invite_code is null

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          // Generate new code and retry
          code = await generateInviteCode()
          retries++
          lastError = `Unique constraint violation, retrying with new code (attempt ${retries})`
          continue
        }
        throw error
      }

      return { success: true, retries }
    } catch (error) {
      retries++
      lastError = error instanceof Error ? error.message : 'Unknown error'
      
      if (retries >= maxRetries) {
        break
      }
      
      // Generate new code for next attempt
      code = await generateInviteCode()
    }
  }

  return { success: false, retries, error: lastError }
}

export async function backfillInviteCodes(params: {
  batchSize: number
  dryRun: boolean
  maxRetries: number
}): Promise<BackfillResult> {
  const { batchSize, dryRun, maxRetries } = params
  const supabase = await supabaseServer()
  
  // Get guests missing invite codes
  const guests = await scanGuestsMissingInviteCode(batchSize)
  
  const result: BackfillResult = {
    updated: 0,
    skipped: 0,
    conflictsResolved: 0,
    rows: []
  }

  for (const guest of guests) {
    const code = await generateInviteCode()
    
    if (dryRun) {
      result.rows.push({
        guest_id: guest.id,
        email: guest.email,
        invite_code: code,
        retries: 0,
        status: 'success'
      })
      result.updated++
    } else {
      const updateResult = await setGuestInviteCode(guest.id, code, maxRetries)
      
      result.rows.push({
        guest_id: guest.id,
        email: guest.email,
        invite_code: code,
        retries: updateResult.retries,
        status: updateResult.success ? 'success' : 'error',
        error: updateResult.error
      })

      if (updateResult.success) {
        result.updated++
        if (updateResult.retries > 0) {
          result.conflictsResolved++
        }
      } else {
        result.skipped++
      }
    }
  }

  // Invalidate cache if not dry run
  if (!dryRun && result.updated > 0) {
    await bumpNamespaceVersion()
  }

  return result
}

/**
 * Find duplicate email addresses in the guests table (case-insensitive)
 */
export async function findDuplicateEmails(): Promise<Array<{
  email: string
  count: number
  guests: Array<{
    id: string
    email: string
    first_name: string
    last_name: string
    created_at: string
  }>
}>> {
  const supabase = await supabaseServer()

  // Get all guests with emails
  const { data: allGuests, error } = await supabase
    .from('guests')
    .select('id, email, first_name, last_name, created_at')
    .not('email', 'is', null)
    .order('created_at', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch guests: ${error.message}`)
  }

  if (!allGuests || allGuests.length === 0) {
    return []
  }

  // Group by lowercase email
  const emailGroups = new Map<string, typeof allGuests>()
  
  for (const guest of allGuests) {
    const emailLower = guest.email!.toLowerCase()
    const group = emailGroups.get(emailLower) || []
    group.push(guest)
    emailGroups.set(emailLower, group)
  }

  // Filter to only duplicates
  const duplicates: Array<{
    email: string
    count: number
    guests: typeof allGuests
  }> = []

  for (const [email, guests] of emailGroups) {
    if (guests.length > 1) {
      duplicates.push({
        email,
        count: guests.length,
        guests: guests.sort((a: any, b: any) => {
          // Sort: uppercase emails first (to be removed), then by creation date
          const aIsUppercase = a.email === a.email!.toUpperCase()
          const bIsUppercase = b.email === b.email!.toUpperCase()
          
          if (aIsUppercase && !bIsUppercase) return -1
          if (!aIsUppercase && bIsUppercase) return 1
          
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        })
      })
    }
  }

  return duplicates.sort((a, b) => b.count - a.count)
}

export interface CleanupDuplicatesResult {
  duplicatesFound: number
  guestsRemoved: number
  guestsKept: number
  errors: Array<{ guestId: string; error: string }>
  details: Array<{
    email: string
    removed: Array<{ id: string; email: string; name: string }>
    kept: { id: string; email: string; name: string }
  }>
}

/**
 * Remove duplicate email addresses from the guests table
 * Priority: Remove uppercase emails first, then keep the oldest guest (by created_at)
 */
export async function cleanupDuplicateEmails(dryRun: boolean = false): Promise<CleanupDuplicatesResult> {
  const supabase = await supabaseServer()
  const duplicates = await findDuplicateEmails()

  const result: CleanupDuplicatesResult = {
    duplicatesFound: duplicates.length,
    guestsRemoved: 0,
    guestsKept: 0,
    errors: [],
    details: []
  }

  for (const duplicate of duplicates) {
    const [toKeep, ...toRemove] = duplicate.guests

    const detail = {
      email: duplicate.email,
      removed: toRemove.map(g => ({
        id: g.id,
        email: g.email!,
        name: `${g.first_name} ${g.last_name}`
      })),
      kept: {
        id: toKeep.id,
        email: toKeep.email!,
        name: `${toKeep.first_name} ${toKeep.last_name}`
      }
    }

    result.details.push(detail)
    result.guestsKept++

    if (!dryRun) {
      // Remove duplicate guests
      for (const guest of toRemove) {
        try {
          // Delete invitations first (cascade should handle this, but be explicit)
          const { error: invError } = await supabase
            .from('invitations')
            .delete()
            .eq('guest_id', guest.id)

          if (invError) {
            console.error(`Error deleting invitations for guest ${guest.id}:`, invError)
          }

          // Delete the guest
          const { error: deleteError } = await supabase
            .from('guests')
            .delete()
            .eq('id', guest.id)

          if (deleteError) {
            result.errors.push({
              guestId: guest.id,
              error: deleteError.message
            })
          } else {
            result.guestsRemoved++
            
            // Log audit
            await logAdminAction('guest_duplicate_removed', {
              guest_id: guest.id,
              guest_email: guest.email,
              guest_name: `${guest.first_name} ${guest.last_name}`,
              kept_guest_id: toKeep.id,
              reason: 'Duplicate email cleanup'
            })
          }
        } catch (error) {
          result.errors.push({
            guestId: guest.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    } else {
      // Dry run - just count
      result.guestsRemoved += toRemove.length
    }
  }

  // Invalidate cache if changes were made
  if (!dryRun && result.guestsRemoved > 0) {
    await bumpNamespaceVersion()

    // Log overall cleanup action
    await logAdminAction('guest_duplicates_cleanup', {
      duplicates_found: result.duplicatesFound,
      guests_removed: result.guestsRemoved,
      guests_kept: result.guestsKept,
      errors: result.errors.length
    })
  }

  return result
}