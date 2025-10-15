import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { invite_code, event_id, notes } = await request.json()

    if (!invite_code || !event_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invite code and event ID are required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Get invitation token by invite code and event
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          invite_code
        ),
        invitation_events!inner(
          id,
          event_id,
          status
        )
      `)
      .eq('guest.invite_code', invite_code)
      .eq('invitation_events.event_id', event_id)
      .eq('invitation_events.status', 'accepted')
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code or invitation not accepted for this event' 
      }, { status: 404 })
    }

    // Get the invitation_event_id for this specific event
    const invitationEvent = invitation.invitation_events.find((ie: any) => ie.event_id === event_id)
    if (!invitationEvent) {
      return NextResponse.json({ 
        success: false, 
        message: 'Guest not invited to this event' 
      }, { status: 400 })
    }

    // Check if already checked in
    const { data: existingCheckin, error: checkError } = await supabase
      .from('attendance_v2')
      .select('id, checked_in_at')
      .eq('invitation_event_id', invitationEvent.id)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing check-in:', checkError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check existing check-in status' 
      }, { status: 500 })
    }

    if (existingCheckin) {
      return NextResponse.json({ 
        success: false, 
        message: 'Guest already checked in for this event',
        guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
        checked_in_at: existingCheckin.checked_in_at
      }, { status: 400 })
    }

    // Perform manual check-in
    const { data: checkin, error: checkinError } = await supabase
      .from('attendance_v2')
      .insert({
        invitation_event_id: invitationEvent.id,
        checked_in_by: (await supabase.auth.getUser()).data.user?.id
      })
      .select(`
        id,
        checked_in_at
      `)
      .single()

    if (checkinError) {
      console.error('Manual check-in error:', checkinError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check in guest' 
      }, { status: 500 })
    }

    // Get event details for response
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name, venue')
      .eq('id', event_id)
      .single()

    if (eventError) {
      console.error('Error fetching event details:', eventError)
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully checked in',
      guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
      guest_email: invitation.guest.email,
      invite_code: invitation.guest.invite_code,
      event_name: eventData?.name || 'Unknown Event',
      event_venue: eventData?.venue || 'Unknown Venue',
      checked_in_at: checkin.checked_in_at,
      method: 'manual'
    })

  } catch (error) {
    console.error('Manual check-in API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
