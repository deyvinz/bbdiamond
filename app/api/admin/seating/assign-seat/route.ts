import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    const { table_id, guest_id, seat_number } = await request.json()

    if (!table_id || !guest_id || !seat_number) {
      return NextResponse.json({ 
        success: false, 
        message: 'Table ID, guest ID, and seat number are required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Check if the seat is already taken
    const { data: existingSeat, error: checkError } = await supabase
      .from('seats')
      .select('id, guest_id')
      .eq('table_id', table_id)
      .eq('seat_number', seat_number)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('Error checking existing seat:', checkError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check seat availability' 
      }, { status: 500 })
    }

    if (existingSeat && existingSeat.guest_id) {
      return NextResponse.json({ 
        success: false, 
        message: 'This seat is already assigned to another guest' 
      }, { status: 400 })
    }

    // Check if the guest is already assigned to a seat at this table
    const { data: existingGuestSeat, error: guestCheckError } = await supabase
      .from('seats')
      .select('id')
      .eq('table_id', table_id)
      .eq('guest_id', guest_id)
      .single()

    if (guestCheckError && guestCheckError.code !== 'PGRST116') {
      console.error('Error checking guest assignment:', guestCheckError)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to check guest assignment' 
      }, { status: 500 })
    }

    if (existingGuestSeat) {
      return NextResponse.json({ 
        success: false, 
        message: 'This guest is already assigned to a seat at this table' 
      }, { status: 400 })
    }

    // Assign the seat
    const { data: seat, error } = await supabase
      .from('seats')
      .upsert({
        table_id,
        guest_id,
        seat_number: parseInt(seat_number)
      })
      .select(`
        id,
        seat_number,
        table_id,
        guest_id
      `)
      .single()

    if (error) {
      console.error('Error assigning seat:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to assign seat' 
      }, { status: 500 })
    }

    // Fetch guest data separately if guest_id exists
    let guest = null
    if (seat.guest_id) {
      const { data: guestData, error: guestError } = await supabase
        .from('guests')
        .select('id, first_name, last_name, email, invite_code')
        .eq('id', seat.guest_id)
        .single()

      if (guestError) {
        console.error('Error fetching guest:', guestError)
        // Don't fail the whole operation if guest fetch fails
      } else {
        guest = guestData
      }
    }

    // Attach guest data to seat
    const seatWithGuest = {
      ...seat,
      guest
    }

    // Invalidate cache to refresh seating data
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      seat: seatWithGuest
    })

  } catch (error) {
    console.error('Error in assign seat API:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
