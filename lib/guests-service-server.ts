import { GuestListResponse, Guest } from './types/guests'
import { supabaseServer } from './supabase-server'
import { bumpNamespaceVersion } from './cache'
import { logInviteCodeBackfill } from './audit'
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
      ...validatedGuest,
      household_id: householdId,
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

  return true
}

export async function createInvitationForGuest(
  guestId: string, 
  eventId: string, 
  headcount: number = 1
): Promise<{ id: string; token: string; created_at: string }> {
  const response = await fetch('/api/guests/invitations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guestId, eventId, headcount }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create invitation')
  }

  return response.json()
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