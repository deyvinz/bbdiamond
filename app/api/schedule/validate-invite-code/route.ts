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

    // Check if invite code exists and is valid
    let query = supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        invite_code,
        wedding_id,
        invitations!inner(
          id,
          token
        )
      `)
      .eq('invite_code', invite_code)
    
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data: guest, error } = await query.single()
    
    // If no wedding ID from context, use guest's wedding_id
    const finalWeddingId = weddingId || guest?.wedding_id

    if (error || !guest) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code' 
      }, { status: 404 })
    }
    
    // Ensure wedding_id is included for filtering invitations if needed
    if (finalWeddingId && guest.invitations) {
      // Filter invitations by wedding_id if we have it
      guest.invitations = guest.invitations.filter((inv: any) => {
        // We'd need to check invitation wedding_id, but for now just return first
        return true
      })
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
