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

    const supabase = await supabaseServer()

    // Call the database function to check in the guest
    const { data, error } = await supabase.rpc('check_in_by_token', { 
      p_token: token 
    })

    if (error) {
      console.error('Check-in error:', error)
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Failed to check in guest' 
      }, { status: 500 })
    }

    return NextResponse.json(data)

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


