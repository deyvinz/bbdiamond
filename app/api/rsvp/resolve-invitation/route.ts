import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()
    
    // Look up invitation by token (not invite_code)
    const { data, error } = await supabase
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
            address
          )
        )
      `)
      .eq('token', token)
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: data.id,
        token: data.token,
        guest: {
          id: data.guest.id,
          first_name: data.guest.first_name,
          last_name: data.guest.last_name,
          email: data.guest.email,
          invite_code: data.guest.invite_code,
        },
        invitation_events: data.invitation_events.map((ie: any) => ({
          id: ie.id,
          event_id: ie.event_id,
          status: ie.status,
          headcount: ie.headcount,
          event: ie.event
        }))
      }
    })
  } catch (error) {
    console.error('Error resolving invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
