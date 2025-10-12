'use server'

import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'

const sendRsvpReminderSchema = z.object({
  invitationId: z.string().uuid(),
  to: z.string().email().optional(),
})

const sendBulkRsvpRemindersSchema = z.object({
  eventIds: z.array(z.string().uuid()).optional(),
  ignoreRateLimit: z.boolean().optional(),
})

interface RsvpReminderResult {
  success: boolean
  sent: number
  skipped: number
  errors: Array<{ invitationId: string; error: string }>
}

/**
 * Send urgent RSVP reminder to a single guest
 */
export async function sendRsvpReminderAction(data: z.infer<typeof sendRsvpReminderSchema>) {
  try {
    const validated = sendRsvpReminderSchema.parse(data)
    const supabase = await supabaseServer()

    // Get invitation with guest and events
    const { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!invitations_guest_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        invitation_events (
          id,
          event_id,
          status,
          event:events!invitation_events_event_id_fkey (
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)
      .eq('id', validated.invitationId)
      .single()

    if (invError || !invitation) {
      throw new Error('Invitation not found')
    }

    // Check if already RSVP'd
    const hasResponded = invitation.invitation_events.some(
      (ie: any) => ie.status === 'accepted' || ie.status === 'declined'
    )

    if (hasResponded) {
      throw new Error('Guest has already RSVP\'d')
    }

    const guest = invitation.guest as any
    const recipientEmail = validated.to || guest.email

    if (!recipientEmail) {
      throw new Error('No email address available')
    }

    // Prepare events data
    const events = invitation.invitation_events.map((ie: any) => ({
      id: ie.event.id,
      name: ie.event.name,
      startsAtISO: ie.event.starts_at,
      venue: ie.event.venue || '',
      address: ie.event.address || '',
    }))

    // Generate RSVP URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
    const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

    // Call edge function to send reminder
    const { data: result, error: functionError } = await supabase.functions.invoke('send-rsvp-reminder', {
      body: {
        to: recipientEmail,
        guestName: `${guest.first_name} ${guest.last_name}`,
        invitationId: invitation.id,
        token: invitation.token,
        events,
        rsvpUrl,
      },
    })

    if (functionError) {
      console.error('Error calling edge function:', functionError)
      throw new Error(`Failed to send reminder: ${functionError.message}`)
    }

    if (!result?.success) {
      throw new Error(result?.error || 'Failed to send reminder')
    }

    return {
      success: true,
      message: 'Urgent RSVP reminder sent successfully',
      messageId: result.messageId,
    }
  } catch (error) {
    console.error('Error in sendRsvpReminderAction:', error)
    throw error
  }
}

/**
 * Send urgent RSVP reminders to all guests who haven't responded
 */
export async function sendBulkRsvpRemindersAction(
  data: z.infer<typeof sendBulkRsvpRemindersSchema> = {}
): Promise<RsvpReminderResult> {
  try {
    const validated = sendBulkRsvpRemindersSchema.parse(data)
    const supabase = await supabaseServer()

    // Build query to get all invitations with pending RSVPs
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!invitations_guest_id_fkey (
          id,
          email,
          first_name,
          last_name
        ),
        invitation_events (
          id,
          event_id,
          status,
          event:events!invitation_events_event_id_fkey (
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)

    // If specific events are provided, filter by them
    if (validated.eventIds && validated.eventIds.length > 0) {
      const { data: invitationsForEvents, error: filterError } = await supabase
        .from('invitation_events')
        .select('invitation_id')
        .in('event_id', validated.eventIds)

      if (filterError) {
        throw new Error(`Failed to filter invitations: ${filterError.message}`)
      }

      const invitationIds = [...new Set(invitationsForEvents.map((ie: any) => ie.invitation_id))]
      query = query.in('id', invitationIds)
    }

    const { data: invitations, error: invError } = await query

    if (invError) {
      throw new Error(`Failed to fetch invitations: ${invError.message}`)
    }

    if (!invitations || invitations.length === 0) {
      return {
        success: true,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    const result: RsvpReminderResult = {
      success: true,
      sent: 0,
      skipped: 0,
      errors: [],
    }

    // Filter to only pending invitations
    const pendingInvitations = invitations.filter((invitation: any) => {
      const hasResponded = invitation.invitation_events.some(
        (ie: any) => ie.status === 'accepted' || ie.status === 'declined'
      )
      return !hasResponded
    })

    console.log(`Found ${pendingInvitations.length} invitations with pending RSVPs`)

    // Send reminders
    for (const invitation of pendingInvitations) {
      try {
        const guest = invitation.guest as any

        if (!guest.email) {
          console.log(`Skipping invitation ${invitation.id}: No email address`)
          result.skipped++
          continue
        }

        // Check rate limit (unless ignored)
        if (!validated.ignoreRateLimit) {
          const { data: recentReminders } = await supabase
            .from('mail_logs')
            .select('created_at')
            .eq('token', invitation.token)
            .eq('metadata->>type', 'rsvp_reminder')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          if (recentReminders && recentReminders.length > 0) {
            console.log(`Skipping invitation ${invitation.id}: Reminder sent in last 24 hours`)
            result.skipped++
            continue
          }
        }

        // Filter events based on eventIds if provided
        let eventsToInclude = invitation.invitation_events
        if (validated.eventIds && validated.eventIds.length > 0) {
          eventsToInclude = eventsToInclude.filter((ie: any) => 
            validated.eventIds!.includes(ie.event_id)
          )
        }

        if (eventsToInclude.length === 0) {
          console.log(`Skipping invitation ${invitation.id}: No matching events`)
          result.skipped++
          continue
        }

        // Prepare events data
        const events = eventsToInclude.map((ie: any) => ({
          id: ie.event.id,
          name: ie.event.name,
          startsAtISO: ie.event.starts_at,
          venue: ie.event.venue || '',
          address: ie.event.address || '',
        }))

        // Generate RSVP URL
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
        const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

        // Call edge function to send reminder
        const { error: functionError } = await supabase.functions.invoke('send-rsvp-reminder', {
          body: {
            to: guest.email,
            guestName: `${guest.first_name} ${guest.last_name}`,
            invitationId: invitation.id,
            token: invitation.token,
            events,
            rsvpUrl,
          },
        })

        if (functionError) {
          console.error(`Error sending reminder for invitation ${invitation.id}:`, functionError)
          result.errors.push({
            invitationId: invitation.id,
            error: functionError.message,
          })
          continue
        }

        result.sent++
        console.log(`✓ Sent reminder to ${guest.email}`)

        // Add delay to avoid rate limiting (100ms between emails)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        console.error(`Error processing invitation ${invitation.id}:`, error)
        result.errors.push({
          invitationId: invitation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    console.log(`Bulk RSVP reminder complete: ${result.sent} sent, ${result.skipped} skipped, ${result.errors.length} errors`)

    return result
  } catch (error) {
    console.error('Error in sendBulkRsvpRemindersAction:', error)
    throw error
  }
}

