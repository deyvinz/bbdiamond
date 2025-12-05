import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const { searchParams } = new URL(request.url)
    const inviteCode = searchParams.get('invite_code')

    if (!inviteCode) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invite code is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Verify guest belongs to this wedding before calling RPC
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, wedding_id')
      .eq('invite_code', inviteCode)
      .eq('wedding_id', weddingId)
      .single()

    if (guestError || !guest) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code or access denied' 
      }, { status: 403 })
    }

    // Call the database function to get check-in status
    // Note: If the RPC function doesn't support wedding_id, it should still be safe
    // since we've verified the guest belongs to this wedding
    const { data, error } = await supabase.rpc('get_guest_checkin_status', { 
      p_invite_code: inviteCode,
      p_wedding_id: weddingId || null
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


