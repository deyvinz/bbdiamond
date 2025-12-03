import { supabase } from './supabase-browser'
import { guestSchema, csvGuestSchema } from './validators'
import { Guest } from './types/guests'
import { CsvRow, downloadCsv } from './csv'
import { bumpNamespaceVersion } from './cache-client'
import { getWeddingIdFromClient } from './wedding-context'

// Generate a unique human-readable invite code
async function generateInviteCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  
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
  }
}

// Client-side functions
export async function createGuest(
  guestData: Partial<Guest>, 
  invitationData?: { event_ids?: string[]; headcount?: number },
  weddingIdParam?: string
) {
  
  // Validate input
  let validatedGuest
  try {
    validatedGuest = guestSchema.parse(guestData)
  } catch (error) {
    console.error('Validation error:', error)
    throw error
  }
  
  // Get wedding ID - use parameter first, then try client context, then database
  let weddingId = weddingIdParam || getWeddingIdFromClient()
  
  // If wedding ID not available, try to get it from database
  if (!weddingId) {
    // Try to get from existing guest or household (don't use .single() to avoid errors)
    const { data: existingGuests } = await supabase
      .from('guests')
      .select('wedding_id')
      .limit(1)
    
    if (existingGuests && existingGuests.length > 0 && existingGuests[0]?.wedding_id) {
      weddingId = existingGuests[0].wedding_id
    } else {
      const { data: existingHouseholds } = await supabase
        .from('households')
        .select('wedding_id')
        .limit(1)
      
      if (existingHouseholds && existingHouseholds.length > 0 && existingHouseholds[0]?.wedding_id) {
        weddingId = existingHouseholds[0].wedding_id
      } else {
        // Try to get from user's profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: ownedWeddings } = await supabase
            .from('weddings')
            .select('id')
            .eq('owner_id', user.id)
            .eq('status', 'active')
            .limit(1)
          
          if (ownedWeddings && ownedWeddings.length > 0 && ownedWeddings[0]?.id) {
            weddingId = ownedWeddings[0].id
          } else {
            const { data: weddingOwners } = await supabase
              .from('wedding_owners')
              .select('wedding_id')
              .eq('customer_id', user.id)
              .limit(1)
            
            if (weddingOwners && weddingOwners.length > 0 && weddingOwners[0]?.wedding_id) {
              weddingId = weddingOwners[0].wedding_id
            }
          }
        }
      }
    }
  }
  
  if (!weddingId) {
    throw new Error('Wedding ID is required to create guests. Please ensure you are in a valid wedding context.')
  }
  
  // Create household if needed
  let householdId = validatedGuest.household_id
  if (validatedGuest.household_name && !householdId) {
    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ 
        name: validatedGuest.household_name,
        wedding_id: weddingId
      })
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
      total_guests: validatedGuest.total_guests || 1,
      invite_code: inviteCode,
      wedding_id: weddingId
    })
    .select(`
      *,
      household:households(name)
    `)
    .single()

  if (guestError) {
    console.error('Guest creation error:', guestError)
    throw new Error(`Failed to create guest: ${guestError.message}`)
  }
  

  // Create invitation if specified
  if (invitationData?.event_ids && invitationData.event_ids.length > 0) {
    
    // First, create the main invitation record
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .insert({
        guest_id: guest.id,
        headcount: invitationData.headcount || 1,
        token: crypto.randomUUID()
      })
      .select()
      .single()
    
    if (invitationError) {
      console.error('Invitation creation error:', invitationError)
      throw new Error(`Failed to create invitation: ${invitationError.message}`)
    }
    
    
    // Then create invitation_events records for each selected event
    const invitationEventInserts = invitationData.event_ids.map((eventId: string) => ({
      invitation_id: invitation.id,
      event_id: eventId,
      headcount: invitationData.headcount || 1,
      event_token: crypto.randomUUID()
    }))
    
    
    const { error: invitationEventsError } = await supabase
      .from('invitation_events')
      .insert(invitationEventInserts)
    
    if (invitationEventsError) {
      console.error('Invitation events creation error:', invitationEventsError)
      throw new Error(`Failed to create invitation events: ${invitationEventsError.message}`)
    }
    
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  return guest
}

export async function updateGuest(guestId: string, guestData: Partial<Guest>) {
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

  // Invalidate cache
  await bumpNamespaceVersion()

  return guest
}

export async function deleteGuest(guestId: string) {
  // Delete guest (cascade will handle invitations/rsvps)
  const { error } = await supabase
    .from('guests')
    .delete()
    .eq('id', guestId)

  if (error) {
    throw new Error(`Failed to delete guest: ${error.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  return true
}

export async function createInvitationForGuest(guestId: string, eventId: string) {
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

  return {
    id: invitation.id,
    token: invitation.token,
    created_at: invitation.created_at
  }
}

export async function regenerateInvitationToken(guestId: string, eventId: string) {
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

  return newToken
}

export async function sendInviteEmail(guestId: string, eventId: string) {
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

  return true
}

export async function exportGuestsToCsv(guests: Guest[]) {
  const csvData: CsvRow[] = guests.map(guest => ({
    first_name: guest.first_name,
    last_name: guest.last_name || '',
    email: guest.email || '',
    phone: guest.phone || '',
    is_vip: guest.is_vip ? 'Yes' : 'No',
    gender: guest.gender || '',
    household_name: guest.household?.name || '',
    rsvp_status: guest.latest_rsvp?.status || 'pending'
  }))

  downloadCsv(csvData, `guests-${new Date().toISOString().split('T')[0]}.csv`)
}

export async function sendInvitesToAllGuests(eventIds: string[]): Promise<{ 
  processed: number; 
  sent: number; 
  skipped: number; 
  errors: string[] 
}> {      
  
  try {
    // Call the server-side bulk invite API
    const response = await fetch('/api/admin/invitations/send-bulk-invite-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        eventIds,
        ignoreRateLimit: true
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to send bulk invites')
    }

    const results = await response.json()
    return results

  } catch (error) {
    console.error('Error in sendInvitesToAllGuests:', error)
    throw new Error(`Failed to send invites to all guests: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function importGuestsFromCsv(csvText: string, eventIds?: string[]): Promise<{ created: number; updated: number; skipped: number; errors: string[] }> {
  const { parseCsv } = await import('./csv')
  const rows = parseCsv(csvText)
  const results: { created: number; updated: number; skipped: number; errors: string[] } = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: []
  }

  // Track processed names to prevent duplicates within CSV
  const processedNames = new Set<string>()
  const duplicateNamesInCsv: string[] = []

  // First pass: validate and check for duplicates within CSV
  const validRows: any[] = []
  for (let i = 0; i < rows.length; i++) {
    try {
      const row = csvGuestSchema.parse(rows[i])
      // Ensure first_name exists and is a string before calling toLowerCase
      const firstName = (row.first_name || '').toString().toLowerCase().trim()
      const lastName = (row.last_name || '').toString().toLowerCase().trim()
      const nameKey = `${firstName}|${lastName}`
      
      if (processedNames.has(nameKey)) {
        duplicateNamesInCsv.push(`${row.first_name} ${row.last_name || ''}`)
        results.skipped++
        continue
      }
      
      processedNames.add(nameKey)
      validRows.push({ ...row, originalIndex: i + 2 })
    } catch (error) {
      results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // Report CSV duplicates
  if (duplicateNamesInCsv.length > 0) {
    results.errors.push(`Duplicate names found in CSV: ${duplicateNamesInCsv.join(', ')}`)
  }

  // Get wedding_id once at the start (for household and guest creation)
  let weddingId = getWeddingIdFromClient()
  if (!weddingId) {
    // Try to get from existing guest or household (don't use .single() to avoid errors)
    const { data: existingGuests } = await supabase
      .from('guests')
      .select('wedding_id')
      .limit(1)
    
    if (existingGuests && existingGuests.length > 0 && existingGuests[0]?.wedding_id) {
      weddingId = existingGuests[0].wedding_id
    } else {
      // Try to get from households
      const { data: existingHouseholds } = await supabase
        .from('households')
        .select('wedding_id')
        .limit(1)
      
      if (existingHouseholds && existingHouseholds.length > 0 && existingHouseholds[0]?.wedding_id) {
        weddingId = existingHouseholds[0].wedding_id
      } else {
        // Try to get from user's profile
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: ownedWeddings } = await supabase
            .from('weddings')
            .select('id')
            .eq('owner_id', user.id)
            .eq('status', 'active')
            .limit(1)
          
          if (ownedWeddings && ownedWeddings.length > 0 && ownedWeddings[0]?.id) {
            weddingId = ownedWeddings[0].id
          } else {
            const { data: weddingOwners } = await supabase
              .from('wedding_owners')
              .select('wedding_id')
              .eq('customer_id', user.id)
              .limit(1)
            
            if (weddingOwners && weddingOwners.length > 0 && weddingOwners[0]?.wedding_id) {
              weddingId = weddingOwners[0].wedding_id
            }
          }
        }
      }
    }
  }
  
  if (!weddingId) {
    throw new Error('Wedding ID is required for CSV import. Please ensure you are in a valid wedding context.')
  }

  // Second pass: process valid rows and check against database
  for (const row of validRows) {
    try {
      // Check if guest exists by first name + last name combination
      const firstName = (row.first_name || '').toString().trim()
      const lastName = (row.last_name || '').toString().trim()
      const { data: existingGuest } = await supabase
        .from('guests')
        .select('id, first_name, last_name, email')
        .ilike('first_name', firstName)
        .ilike('last_name', lastName)
        .single()

      if (existingGuest) {
        // Update existing guest
        await updateGuest(existingGuest.id, row as Partial<Guest>)
        results.updated++
      } else {
        // Create new guest (pass wedding_id if we have it)
        const newGuest = await createGuest(row as Partial<Guest>, undefined, weddingId || undefined)
        results.created++
        
        // Create invitations if eventIds provided
        if (eventIds && eventIds.length > 0) {
          for (const eventId of eventIds) {
            await createInvitationForGuest(newGuest.id, eventId)
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('PGRST116')) {
        // No existing guest found (this is expected for new guests)
        try {
          const newGuest = await createGuest(row as Partial<Guest>, undefined, weddingId || undefined)
          results.created++
          
          // Create invitations if eventIds provided
          if (eventIds && eventIds.length > 0) {
            for (const eventId of eventIds) {
              await createInvitationForGuest(newGuest.id, eventId)
            }
          }
        } catch (createError) {
          results.errors.push(`Row ${row.originalIndex}: Failed to create guest - ${createError instanceof Error ? createError.message : 'Unknown error'}`)
        }
      } else {
        results.errors.push(`Row ${row.originalIndex}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  return results
}
