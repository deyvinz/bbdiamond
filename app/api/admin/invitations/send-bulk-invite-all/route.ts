import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { createInvitationForGuest } from '@/lib/guests-service-server'
import { sendInviteEmail } from '@/lib/invitations-service'

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      return NextResponse.json({ error: 'Unauthorized: Only admin or staff can send bulk invites' }, { status: 403 })
    }

    const body = await request.json()
    const { eventIds, ignoreRateLimit = false } = body

    if (!eventIds || !Array.isArray(eventIds)) {
      return NextResponse.json({ error: 'Invalid request: eventIds is required' }, { status: 400 })
    }

    console.log('Bulk invite processing started for eventIds:', eventIds)

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      errors: [] as string[]
    }

    // Fetch all guests with their invitations and RSVP status
    const { data: guests, error: guestsError } = await supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        invitations(
          id,
          token,
          invitation_events(
            id,
            event_id,
            status,
            event:events(name, starts_at, venue, address),
            rsvps_v2(response, created_at)
          )
        )
      `)

    if (guestsError) {
      console.error('Error fetching guests:', guestsError)
      return NextResponse.json({ error: `Failed to fetch guests: ${guestsError.message}` }, { status: 500 })
    }

    console.log(`Found ${guests?.length || 0} guests to process`)

    for (const guest of guests || []) {
      results.processed++
      
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
          console.log(`Skipping ${guest.first_name} ${guest.last_name} - already responded`)
          results.skipped++
          continue
        }

        // Check if guest has invitations for the specified events
        let hasInvitationsForEvents = false
        let invitationId = null
        let existingEventIds: string[] = []

        if (guest.invitations && guest.invitations.length > 0) {
          const invitation = guest.invitations[0]
          invitationId = invitation.id
          existingEventIds = invitation.invitation_events?.map((ie: any) => ie.event_id) || []
          
          // Check if guest has invitations for any of the specified events
          hasInvitationsForEvents = eventIds.some(eventId => existingEventIds.includes(eventId))
        }

        // Create invitations for events that don't exist yet
        const eventsToCreateInvitationsFor = eventIds.filter(eventId => !existingEventIds.includes(eventId))
        
        if (eventsToCreateInvitationsFor.length > 0) {
          console.log(`Creating invitations for ${guest.first_name} ${guest.last_name} for events:`, eventsToCreateInvitationsFor)
          
          for (const eventId of eventsToCreateInvitationsFor) {
            await createInvitationForGuest(guest.id, eventId)
          }
        }

        // Send email for all specified events (ignore rate limit)
        const eventsToSendFor = hasInvitationsForEvents ? 
          eventIds.filter(eventId => existingEventIds.includes(eventId)) : 
          eventIds

        if (eventsToSendFor.length > 0) {
          console.log(`Sending invite email to ${guest.first_name} ${guest.last_name} for events:`, eventsToSendFor)
          
          // Get the invitation ID (either existing or newly created)
          if (!invitationId) {
            const { data: invitation } = await supabase
              .from('invitations')
              .select('id')
              .eq('guest_id', guest.id)
              .single()
            invitationId = invitation?.id
          }

          if (invitationId) {
            // Call the send invite email function directly
            try {
              await sendInviteEmail({
                invitationId,
                eventIds: eventsToSendFor,
                includeQr: true,
                ignoreRateLimit: ignoreRateLimit
              })
              results.sent++
            } catch (emailError) {
              throw new Error(`Failed to send email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}`)
            }
          } else {
            throw new Error('Could not find or create invitation')
          }
        } else {
          console.log(`Skipping ${guest.first_name} ${guest.last_name} - no events to send for`)
          results.skipped++
        }

      } catch (error) {
        console.error(`Error processing guest ${guest.first_name} ${guest.last_name}:`, error)
        results.errors.push(`${guest.first_name} ${guest.last_name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    console.log('Bulk invite results:', results)
    return NextResponse.json(results)

  } catch (error) {
    console.error('Send bulk invite all error:', error)
    return NextResponse.json(
      { error: 'Failed to send bulk invites to all guests' },
      { status: 500 }
    )
  }
}
