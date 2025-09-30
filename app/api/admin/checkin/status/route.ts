import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const inviteCode = searchParams.get('invite_code')

    if (!inviteCode) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invite code is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Call the database function to get check-in status
    const { data, error } = await supabase.rpc('get_guest_checkin_status', { 
      p_invite_code: inviteCode 
    })

    if (error) {
      console.error('Check-in status error:', error)
      return NextResponse.json({ 
        success: false, 
        message: error.message || 'Failed to get check-in status' 
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    console.error('Check-in status API error:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}


