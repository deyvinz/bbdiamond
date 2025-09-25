import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

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

    // Check if invite code exists and is valid
    const { data: guest, error } = await supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        invite_code,
        invitations!inner(
          id,
          token
        )
      `)
      .eq('invite_code', invite_code)
      .single()

    if (error || !guest) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code' 
      }, { status: 404 })
    }

    // Return guest info for personalization
    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
        invite_code: guest.invite_code,
        invitation_token: guest.invitations[0]?.token
      }
    })

  } catch (error) {
    console.error('Error validating invite code:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to validate invite code' 
    }, { status: 500 })
  }
}
