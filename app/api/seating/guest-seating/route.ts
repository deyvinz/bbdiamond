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

    // Get guest's seating information using your existing schema
    let query = supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        wedding_id,
        seats:seats!seats_guest_id_fkey(
          id,
          seat_number,
          table:seating_tables(
            id,
            name,
            capacity,
            event:events(
              id,
              name,
              starts_at,
              venue,
              address
            )
          )
        )
      `)
      .eq('invite_code', invite_code)
    
    if (weddingId) {
      query = query.eq('wedding_id', weddingId)
    }
    
    const { data: guest, error: guestError } = await query.single()
    
    // Use wedding_id from guest if not provided
    const finalWeddingId = weddingId || guest?.wedding_id

    if (guestError || !guest) {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid invite code or no seating assignment found' 
      }, { status: 404 })
    }

    // Filter out seats without table/event data
    const validSeats = guest.seats?.filter(
      (seat: any) => seat.table && seat.table.event
    ) || []

    return NextResponse.json({
      success: true,
      guest: {
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
      },
      seats: validSeats.map((seat: any) => ({
        id: seat.id,
        seat_number: seat.seat_number,
        table: {
          id: seat.table.id,
          name: seat.table.name,
          capacity: seat.table.capacity,
        },
        event: {
          id: seat.table.event.id,
          name: seat.table.event.name,
          starts_at: seat.table.event.starts_at,
          venue: seat.table.event.venue,
          address: seat.table.event.address,
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching guest seating:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Failed to fetch seating information' 
    }, { status: 500 })
  }
}
