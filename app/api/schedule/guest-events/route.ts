import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { getWeddingIdFromRequest } from '@/lib/api-wedding-context'

export async function POST(request: NextRequest) {
  try {
    const { invite_code } = await request.json()

    if (!invite_code) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invite code is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()
    
    // Try to get wedding ID (optional for public routes)
    const weddingId = await getWeddingIdFromRequest(request)

    // Get guest's specific events through their invitation
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
          status,
          headcount,
          event:events(
            id,
            name,
            starts_at,
            venue,
            address,
            icon
          )
        )
      `)
      .eq('guest.invite_code', invite_code)
    
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data: invitation, error } = await query.single()

    if (error || !invitation) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code or no invitation found' 
      }, { status: 404 })
    }

    // Extract events from invitation_events
    const events = invitation.invitation_events
      .filter((ie: any) => ie.event) // Only include events that exist
      .map((ie: any) => ({
        id: ie.event.id,
        name: ie.event.name,
        starts_at: ie.event.starts_at,
        venue: ie.event.venue,
        address: ie.event.address,
        icon: ie.event.icon,
        invitation_status: ie.status,
        headcount: ie.headcount
      }))
      .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())

    return NextResponse.json({
      success: true,
      events,
      guest: {
        id: invitation.guest.id,
        first_name: invitation.guest.first_name,
        last_name: invitation.guest.last_name,
        email: invitation.guest.email,
        invite_code: invitation.guest.invite_code,
        invitation_token: invitation.token
      }
    })

  } catch (error) {
    console.error('Error fetching guest events:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch guest events' 
    }, { status: 500 })
  }
}
