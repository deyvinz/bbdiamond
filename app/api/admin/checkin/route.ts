import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const { token, method = 'qr_code', notes } = await request.json()

    if (!token) {
      return NextResponse.json({ 
        success: false, 
        message: 'Token is required' 
      }, { status: 400 })
    }

    // Extract token from URL if QR code contains full URL
    let actualToken = token
    if (token.includes('admin/checkin?token=')) {
      const url = new URL(token)
      actualToken = url.searchParams.get('token') || token
    }

    console.log('Original token:', token)
    console.log('Extracted token:', actualToken)

    const supabase = await supabaseServer()

    // Get wedding ID (admin routes should have wedding context)
    const weddingId = request.headers.get('x-wedding-id') || request.cookies.get('wedding_id')?.value
    
    // Find invitation by token (without status filter first)
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        wedding_id,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          invite_code
        ),
        invitation_events(
          id,
          event_id,
          status
        )
      `)
      .eq('token', actualToken)
    
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data: invitation, error: invitationError } = await query.single()

    console.log('Token lookup result:', { actualToken, invitationError, invitation })

    if (invitationError || !invitation) {
      console.log('Invitation not found or error:', { invitationError, invitation })
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid token or invitation not found' 
      }, { status: 404 })
    }

    // Filter for accepted events
    const acceptedEvents = invitation.invitation_events.filter((ie: any) => ie.status === 'accepted')
    
    if (acceptedEvents.length === 0) {
      console.log('No accepted events found:', invitation.invitation_events)
      return NextResponse.json({ 
        success: false, 
        message: 'No accepted invitations found for this token' 
      }, { status: 400 })
    }

    // Use wedding_id from invitation if not in context
    const finalWeddingId = weddingId || invitation?.wedding_id

    // Check if already checked in for any event
    let checkinQuery = supabase
      .from('attendance_v2')
      .select('id, checked_in_at, invitation_event_id')
      .in('invitation_event_id', acceptedEvents.map((ie: any) => ie.id))
      .limit(1)
    
    if (finalWeddingId) {
      // Filter by wedding_id if attendance_v2 has wedding_id column
      // Note: attendance_v2 may not have wedding_id, so this might need adjustment
      checkinQuery = checkinQuery.eq('wedding_id', finalWeddingId)
    }
    
    const { data: existingCheckin, error: checkError } = await checkinQuery

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing check-in:', checkError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check existing check-in status' 
      }, { status: 500 })
    }

    if (existingCheckin && existingCheckin.length > 0) {
      // Find which event they're checked into
      const checkedInEvent = acceptedEvents.find((ie: any) => ie.id === existingCheckin[0].invitation_event_id)
      return NextResponse.json({ 
        success: false, 
        message: 'Guest already checked in',
        guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
        checked_in_at: existingCheckin[0].checked_in_at,
        event_name: checkedInEvent?.event_id || 'Unknown Event'
      }, { status: 400 })
    }

    // Check in for the first accepted event
    const firstEvent = acceptedEvents[0]
    const checkinData: any = {
      invitation_event_id: firstEvent.id,
      checked_in_by: (await supabase.auth.getUser()).data.user?.id
    }
    
    if (finalWeddingId) {
      checkinData.wedding_id = finalWeddingId
    }
    
    const { data: checkin, error: checkinError } = await supabase
      .from('attendance_v2')
      .insert(checkinData)
      .select(`
        id,
        checked_in_at
      `)
      .single()

    if (checkinError) {
      console.error('Check-in error:', checkinError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check in guest' 
      }, { status: 500 })
    }

    // Get event details for response
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('name, venue')
      .eq('id', firstEvent.event_id)
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
      method: 'qr_code'
    })

  } catch (error) {
    console.error('Check-in API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    const supabase = await supabaseServer()

    // Get check-in statistics
    const { data: stats, error } = await supabase.rpc('get_checkin_stats', {
      p_event_id: eventId || null
    })

    if (error) {
      console.error('Stats error:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to get check-in statistics' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      stats
    })

  } catch (error) {
    console.error('Stats API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}


