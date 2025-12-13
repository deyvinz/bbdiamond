'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { 
  createInvitationsForGuests,
  updateInvitation,
  deleteInvitations,
  regenerateInviteToken,
  regenerateEventToken,
  sendInviteEmail,
  importInvitationsFromCsv,
  type CreateInvitationInput,
  type UpdateInvitationInput,
  type CsvInvitationInput,
  type SendEmailInput
} from '@/lib/invitations-service'
import { submitRsvp } from '@/lib/rsvp-service'
import { logInvitationAction, logAdminAction } from '@/lib/audit'
import { logger } from '../logger'

export async function createInvitationsAction(data: CreateInvitationInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can create invitations.',
    }
  }

  try {
    const result = await createInvitationsForGuests(data.guest_ids, data.events)
    
    revalidatePath('/admin/invitations')
    
    return { 
      success: true, 
      invitations: result.invitations,
      created: result.created,
      skipped: result.skipped,
      skippedGuestIds: result.skippedGuestIds
    }
  } catch (error) {
    console.error('Create invitations action failed:', error)
    return {
      success: false,
      message: `Failed to create invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function updateInvitationAction(invitationId: string, data: UpdateInvitationInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can update invitations.',
    }
  }

  try {
    const invitation = await updateInvitation(invitationId, data)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, invitation }
  } catch (error) {
    console.error('Update invitation action failed:', error)
    return {
      success: false,
      message: `Failed to update invitation: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function deleteInvitationsAction(invitationIds: string[]) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can delete invitations.',
    }
  }

  try {
    await deleteInvitations(invitationIds)
    
    revalidatePath('/admin/invitations')
    
    return { success: true }
  } catch (error) {
    console.error('Delete invitations action failed:', error)
    return {
      success: false,
      message: `Failed to delete invitations: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function regenerateInviteTokenAction(invitationId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can regenerate tokens.',
    }
  }

  try {
    const newToken = await regenerateInviteToken(invitationId)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, token: newToken }
  } catch (error) {
    console.error('Regenerate invite token action failed:', error)
    return {
      success: false,
      message: `Failed to regenerate token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function regenerateEventTokenAction(invitationEventId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can regenerate tokens.',
    }
  }

  try {
    const newToken = await regenerateEventToken(invitationEventId)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, token: newToken }
  } catch (error) {
    console.error('Regenerate event token action failed:', error)
    return {
      success: false,
      message: `Failed to regenerate token: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

export async function sendInviteEmailAction(data: SendEmailInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can send notifications.')
  }

  try {
    // Use notification service with priority-based routing
    // This automatically determines the best channel (email/SMS/WhatsApp) based on:
    // 1. Wedding's notification configuration
    // 2. Guest's available contact info (email/phone)
    // 3. Channel priority: email > WhatsApp > SMS
    const { sendInvitationNotification } = await import('@/lib/notification-service')
    const result = await sendInvitationNotification({
      invitationId: data.invitationId,
      eventIds: data.eventIds,
      ignoreRateLimit: data.ignoreRateLimit,
    })
    
    revalidatePath('/admin/invitations')
    
    // Return in the format expected by the UI
    const successfulResult = result.results.find(r => r.success)
    if (successfulResult) {
      const channelName = successfulResult.channel === 'email' ? 'email' 
        : successfulResult.channel === 'sms' ? 'SMS'
        : successfulResult.channel === 'whatsapp' ? 'WhatsApp'
        : successfulResult.channel
      return { success: true, message: `Invitation sent successfully via ${channelName}` }
    } else {
      // Check if it was skipped vs failed
      const skippedResult = result.results.find(r => r.skipped)
      if (skippedResult) {
        // Build user-friendly skip message
        let skipMessage = skippedResult.skipReason || 'No notification channel available'
        if (skipMessage.includes('no email or phone')) {
          skipMessage = 'Guest has no email or phone number. Please add contact information first.'
        } else if (skipMessage.includes('no email')) {
          skipMessage = 'Guest has no email address. SMS or WhatsApp will be used if available.'
        } else if (skipMessage.includes('no phone')) {
          skipMessage = 'Guest has no phone number. Email will be used if available.'
        }
        return { 
          success: false, 
          message: skipMessage,
          skipped: true
        }
      }
      
      const failedResult = result.results[0]
      return { 
        success: false, 
        message: failedResult?.error || 'Failed to send notification. Please try again.' 
      }
    }
  } catch (error) {
    console.error('Send invite notification action failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Provide user-friendly error messages
    if (errorMessage.includes('Invitation not found')) {
      return {
        success: false,
        message: 'Invitation not found. Please refresh and try again.',
      }
    }
    
    if (errorMessage.includes('Guest not found')) {
      return {
        success: false,
        message: 'Guest information not found. Please refresh and try again.',
      }
    }
    
    if (errorMessage.includes('No valid events')) {
      return {
        success: false,
        message: 'No valid events found for this invitation.',
      }
    }
    
    if (errorMessage.includes('preferred_contact_method')) {
      return {
        success: false,
        message: 'Database error. Please refresh and try again.',
      }
    }
    
    return {
      success: false,
      message: `Failed to send notification: ${errorMessage}`,
    }
  }
}

export async function importInvitationsAction(data: CsvInvitationInput[]) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: 0,
      errors: [{ row: 0, error: 'Unauthorized: Only admin or staff can import invitations.' }],
    }
  }

  try {
    const result = await importInvitationsFromCsv(data)
    
    revalidatePath('/admin/invitations')
    
    return result
  } catch (error) {
    console.error('Import invitations action failed:', error)
    return {
      success: 0,
      errors: [{ row: 0, error: `Failed to import invitations: ${error instanceof Error ? error.message : 'Unknown error'}` }],
    }
  }
}

export async function resendRsvpConfirmationAction(invitationId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can resend RSVP confirmations.',
    }
  }

  try {
    // Get wedding ID for multi-tenant support
    const { getWeddingId } = await import('@/lib/wedding-context-server')
    const weddingId = await getWeddingId()

    // Get invitation with fallback query (for backward compatibility)
    let { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        wedding_id,
        guest:guests!inner(
          id,
          invite_code,
          email,
          phone
        ),
        invitation_events!inner(
          event_id,
          status,
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
      .maybeSingle()

    // Fallback query if not found with wedding_id filter
    if ((invitationError || !invitation) && weddingId) {
      const { data: fallbackInvitation, error: fallbackError } = await supabase
        .from('invitations')
        .select(`
          id,
          token,
          wedding_id,
          guest:guests!inner(
            id,
            invite_code,
            email,
            phone
          ),
          invitation_events!inner(
            event_id,
            status,
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
        .maybeSingle()

      if (fallbackError) {
        return {
          success: false,
          message: `Invitation not found: ${fallbackError.message}`,
        }
      }

      if (fallbackInvitation) {
        // Verify the invitation's wedding_id matches if it's set
        if (!fallbackInvitation.wedding_id || fallbackInvitation.wedding_id === weddingId) {
          invitation = fallbackInvitation
          invitationError = null
        } else {
          return {
            success: false,
            message: `Invitation belongs to a different wedding (ID: ${fallbackInvitation.wedding_id})`,
          }
        }
      }
    }

    if (invitationError || !invitation) {
      return {
        success: false,
        message: 'Invitation not found. Please refresh and try again.',
      }
    }

    // Check if there are any accepted events
    const acceptedEvents = invitation.invitation_events.filter((event: any) => event.status === 'accepted')
    if (acceptedEvents.length === 0) {
      return {
        success: false,
        message: 'This invitation has no accepted events to resend confirmation for.',
      }
    }

    // Prepare the data for resending with multi-channel support
    // submitRsvp will use sendRsvpConfirmation which supports email/SMS/WhatsApp
    const rsvpData = {
      invite_code: invitation.guest.invite_code,
      response: 'accepted' as const,
      email: invitation.guest.email || undefined,
      phone: invitation.guest.phone || undefined,
      // preferred_channel will be determined by sendRsvpConfirmation based on config
    }

    const result = await submitRsvp(rsvpData, user.id)

    if (!result.success) {
      return {
        success: false,
        message: result.message || 'Failed to resend RSVP confirmation.',
      }
    }

    // Log the action
    await logInvitationAction(
      'resend_rsvp_confirmation',
      { invitationId },
      user.id,
      undefined,
      undefined
    )

    revalidatePath('/admin/invitations')

    return {
      success: true,
      message: 'RSVP confirmation sent successfully. Check the guest\'s email or phone for details.',
    }
  } catch (error) {
    logger.error('Resend RSVP confirmation action failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Provide user-friendly error messages
    if (errorMessage.includes('Invitation not found')) {
      return {
        success: false,
        message: 'Invitation not found. Please refresh and try again.',
      }
    }

    if (errorMessage.includes('no accepted events')) {
      return {
        success: false,
        message: 'This invitation has no accepted events to resend confirmation for.',
      }
    }

    return {
      success: false,
      message: `Failed to resend RSVP confirmation: ${errorMessage}`,
    }
  }
}

/**
 * Count guests without RSVP (guests with pending invitation events)
 */
export async function countGuestsWithoutRsvpAction(): Promise<{ success: boolean; count?: number; message?: string }> {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      message: 'Unauthorized: Please sign in.',
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can perform this action.',
    }
  }

  try {
    const { getWeddingId } = await import('@/lib/wedding-context-server')
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
      return {
        success: false,
        message: 'Wedding ID is required.',
      }
    }

    // Get all invitations with their events
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        guest_id,
        invitation_events(
          id,
          status
        )
      `)
      .eq('wedding_id', weddingId)

    if (error) {
      logger.error('Error counting guests without RSVP:', error)
      return {
        success: false,
        message: `Failed to count guests: ${error.message}`,
      }
    }

    // Filter to guests who have at least one pending invitation event
    // and no accepted or declined events
    const guestsWithoutRsvp = (invitations || []).filter((invitation: any) => {
      const events = invitation.invitation_events || []
      const hasPending = events.some((ie: any) => ie.status === 'pending')
      const hasResponded = events.some((ie: any) => 
        ie.status === 'accepted' || ie.status === 'declined'
      )
      return hasPending && !hasResponded
    })

    return {
      success: true,
      count: guestsWithoutRsvp.length,
    }
  } catch (error) {
    logger.error('Count guests without RSVP action failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to count guests: ${errorMessage}`,
    }
  }
}

/**
 * Send invitations to all guests (optimized: skips guests who already RSVP'd, creates missing invitations)
 * This is the merged and optimized version of both sendInvitesToAllGuests and sendInvitationsToGuestsWithoutRsvpAction
 */
export async function sendInvitationsToAllGuestsAction(eventIds?: string[]): Promise<{
  success: boolean
  processed?: number
  sent?: number
  skipped?: number
  errors?: Array<{ guestId: string; error: string }>
  message?: string
}> {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      message: 'Unauthorized: Please sign in.',
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can perform this action.',
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
    }
  }

  try {
    const { getWeddingId } = await import('@/lib/wedding-context-server')
    const { createInvitationForGuest } = await import('@/lib/guests-service-server')
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
      return {
        success: false,
        message: 'Wedding ID is required.',
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    // Get event IDs - use provided or fetch all events
    let validEventIds: string[] = []
    if (eventIds && eventIds.length > 0) {
      // Verify provided events belong to this wedding
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .in('id', eventIds)
        .eq('wedding_id', weddingId)
      
      validEventIds = events?.map((e: { id: string }) => e.id) || []
    } else {
      // Fetch all events for this wedding
      const { data: events } = await supabase
        .from('events')
        .select('id')
        .eq('wedding_id', weddingId)
      
      validEventIds = events?.map((e: { id: string }) => e.id) || []
    }

    if (validEventIds.length === 0) {
      return {
        success: false,
        message: 'No events found. Please create events first.',
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    // Fetch all guests with their invitations and RSVP status
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        invitations(
          id,
          invitation_events(
            id,
            event_id,
            status,
            rsvps_v2(response)
          )
        )
      `)
      .eq('wedding_id', weddingId)

    if (guestsError) {
      logger.error('Error fetching guests:', guestsError)
      return {
        success: false,
        message: `Failed to fetch guests: ${guestsError.message}`,
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    if (!guests || guests.length === 0) {
      return {
        success: true,
        message: 'No guests found.',
        processed: 0,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    // Use notification service for multi-channel support (email/SMS/WhatsApp)
    const { sendInvitationNotification } = await import('@/lib/notification-service')
    
    let processed = 0
    let sent = 0
    let skipped = 0
    const errors: Array<{ guestId: string; error: string }> = []

    for (const guest of guests) {
      processed++
      
      try {
        // Check if guest has any RSVP with accepted or declined status
        const hasResponded = guest.invitations?.some((invitation: any) => 
          invitation.invitation_events?.some((ie: any) => 
            ie.rsvps_v2?.some((rsvp: any) => 
              rsvp.response === 'accepted' || rsvp.response === 'declined'
            )
          )
        )

        if (hasResponded) {
          skipped++
          continue
        }

        // Get or create invitation
        let invitationId: string | null = null
        let existingEventIds: string[] = []

        if (guest.invitations && guest.invitations.length > 0) {
          const invitation = guest.invitations[0]
          invitationId = invitation.id
          existingEventIds = invitation.invitation_events?.map((ie: any) => ie.event_id) || []
        }

        // Create invitations for events that don't exist yet
        const eventsToCreateInvitationsFor = validEventIds.filter(eventId => !existingEventIds.includes(eventId))
        
        if (eventsToCreateInvitationsFor.length > 0) {
          for (const eventId of eventsToCreateInvitationsFor) {
            try {
              await createInvitationForGuest(guest.id, eventId)
              // Refresh invitation data after creation
              if (!invitationId) {
                const { data: newInvitation } = await supabase
                  .from('invitations')
                  .select('id')
                  .eq('guest_id', guest.id)
                  .eq('wedding_id', weddingId)
                  .single()
                invitationId = newInvitation?.id || null
              }
            } catch (createError) {
              logger.warn(`Failed to create invitation for guest ${guest.id}, event ${eventId}:`, createError)
            }
          }
        }

        // Get invitation ID if we still don't have it
        if (!invitationId) {
          const { data: invitation } = await supabase
            .from('invitations')
            .select('id')
            .eq('guest_id', guest.id)
            .eq('wedding_id', weddingId)
            .single()
          invitationId = invitation?.id || null
        }

        if (!invitationId) {
          skipped++
          errors.push({
            guestId: guest.id,
            error: 'Could not find or create invitation'
          })
          continue
        }

        // Send invitations using notification service (multi-channel support)
        const result = await sendInvitationNotification({
          invitationId,
          eventIds: validEventIds,
          ignoreRateLimit: true,
        })

        // Check if any channel succeeded
        const successfulResult = result.results.find(r => r.success)
        if (successfulResult) {
          sent++
        } else {
          // Check if it was skipped vs failed
          const skippedResult = result.results.find(r => r.skipped)
          if (skippedResult) {
            skipped++
          } else {
            const failedResult = result.results[0]
            errors.push({
              guestId: guest.id,
              error: failedResult?.error || 'Failed to send notification'
            })
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          guestId: guest.id,
          error: errorMessage,
        })
      }
    }

    revalidatePath('/admin/guests')
    revalidatePath('/admin/invitations')

    return {
      success: true,
      processed,
      sent,
      skipped,
      errors,
      message: `Processed ${processed} guest${processed !== 1 ? 's' : ''}: ${sent} invitation${sent !== 1 ? 's' : ''} sent, ${skipped} skipped${errors.length > 0 ? `, ${errors.length} error${errors.length !== 1 ? 's' : ''}` : ''}.`,
    }
  } catch (error) {
    logger.error('Send invitations to all guests action failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to send invitations: ${errorMessage}`,
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [],
    }
  }
}

/**
 * Fix invitation headcounts for all events to match guest's total_guests
 */
export async function fixInvitationHeadcountsAction(): Promise<{
  success: boolean
  fixed?: number
  skipped?: number
  errors?: Array<{ guestId: string; error: string }>
  message?: string
}> {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      success: false,
      message: 'Unauthorized: Please sign in.',
      fixed: 0,
      skipped: 0,
      errors: [],
    }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    return {
      success: false,
      message: 'Unauthorized: Only admin or staff can perform this action.',
      fixed: 0,
      skipped: 0,
      errors: [],
    }
  }

  try {
    const { getWeddingId } = await import('@/lib/wedding-context-server')
    const { validateAndEnforceHeadcount } = await import('@/lib/invitations-service')
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
      return {
        success: false,
        message: 'Wedding ID is required.',
        fixed: 0,
        skipped: 0,
        errors: [],
      }
    }

    // Get all invitations with their events and guest info
    const { data: invitations, error } = await supabase
      .from('invitations')
      .select(`
        id,
        guest_id,
        guest:guests!inner(
          id,
          total_guests
        ),
        invitation_events(
          id,
          event_id,
          headcount,
          status
        )
      `)
      .eq('wedding_id', weddingId)

    if (error) {
      logger.error('Error fetching invitations:', error)
      return {
        success: false,
        message: `Failed to fetch invitations: ${error.message}`,
        fixed: 0,
        skipped: 0,
        errors: [],
      }
    }

    if (!invitations || invitations.length === 0) {
      return {
        success: true,
        message: 'No invitations found.',
        fixed: 0,
        skipped: 0,
        errors: [],
      }
    }

    let fixed = 0
    let skipped = 0
    const errors: Array<{ guestId: string; error: string }> = []

    // Process each invitation
    for (const invitation of invitations) {
      try {
        const guest = invitation.guest as { id: string; total_guests: number | null }
        const invitationEvents = invitation.invitation_events as Array<{
          id: string
          event_id: string
          headcount: number
          status: string
        }>

        if (!invitationEvents || invitationEvents.length === 0) {
          skipped++
          continue
        }

        // Validate and enforce headcount for each event
        const eventDefs = invitationEvents.map(ie => ({
          event_id: ie.event_id,
          headcount: ie.headcount,
          status: ie.status
        }))
        
        const validatedEvents = await validateAndEnforceHeadcount(
          eventDefs,
          guest.total_guests || undefined
        )

        // Create a map of validated events by event_id for quick lookup
        const validatedEventsMap = new Map(
          validatedEvents.map(ve => [ve.event_id, ve])
        )

        // Update invitation events that need fixing
        for (const currentEvent of invitationEvents) {
          const validatedEvent = validatedEventsMap.get(currentEvent.event_id)
          
          if (!validatedEvent) {
            errors.push({
              guestId: invitation.guest_id,
              error: `Validated event not found for event ${currentEvent.event_id}`
            })
            continue
          }

          // Only update if headcount changed
          if (currentEvent.headcount !== validatedEvent.headcount) {
            const { error: updateError } = await supabase
              .from('invitation_events')
              .update({ headcount: validatedEvent.headcount })
              .eq('id', currentEvent.id)
              .eq('wedding_id', weddingId)

            if (updateError) {
              errors.push({
                guestId: invitation.guest_id,
                error: `Failed to update event ${currentEvent.event_id}: ${updateError.message}`
              })
            } else {
              fixed++
            }
          } else {
            skipped++
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        errors.push({
          guestId: invitation.guest_id,
          error: errorMessage
        })
      }
    }

    // Invalidate cache
    const { bumpNamespaceVersion } = await import('@/lib/cache')
    await bumpNamespaceVersion()

    // Log audit
    await logAdminAction(
      'fix_invitation_headcounts',
      {
        wedding_id: weddingId,
        fixed_count: fixed,
        skipped_count: skipped,
        error_count: errors.length
      },
      user.id
    )

    revalidatePath('/admin/guests')
    revalidatePath('/admin/invitations')

    return {
      success: true,
      fixed,
      skipped,
      errors,
      message: `Fixed ${fixed} invitation headcount${fixed !== 1 ? 's' : ''}.${errors.length > 0 ? ` ${errors.length} error${errors.length !== 1 ? 's' : ''} occurred.` : ''}`,
    }
  } catch (error) {
    logger.error('Fix invitation headcounts action failed:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      message: `Failed to fix headcounts: ${errorMessage}`,
      fixed: 0,
      skipped: 0,
      errors: [],
    }
  }
}
