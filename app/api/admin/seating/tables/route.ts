import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event ID is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Get tables with their seats
    const { data: tables, error } = await supabase
      .from('seating_tables')
      .select(`
        id,
        event_id,
        name,
        capacity,
        pos_x,
        pos_y,
        seats!seats_table_id_fkey(
          id,
          seat_number,
          guest_id
        )
      `)
      .eq('event_id', eventId)
      .order('name')

    if (error) {
      console.error('Error fetching tables:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to fetch tables' 
      }, { status: 500 })
    }

    // Get all guest IDs from seats
    const guestIds = new Set<string>()
    tables?.forEach((table: any) => {
      table.seats?.forEach((seat: any) => {
        if (seat.guest_id) {
          guestIds.add(seat.guest_id)
        }
      })
    })

    // Fetch guest data separately
    let guests: any[] = []
    if (guestIds.size > 0) {
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('id, first_name, last_name, email, invite_code')
        .in('id', Array.from(guestIds))

      if (guestsError) {
        console.error('Error fetching guests:', guestsError)
        return NextResponse.json({ 
          success: false, 
          message: 'Failed to fetch guest data' 
        }, { status: 500 })
      }
      guests = guestsData || []
    }

    // Create a map for quick guest lookup
    const guestsMap = new Map(guests.map(guest => [guest.id, guest]))

    // Attach guest data to seats
    const tablesWithGuests = tables?.map((table: any) => ({
      ...table,
      seats: table.seats?.map((seat: any) => ({
        ...seat,
        guest: seat.guest_id ? guestsMap.get(seat.guest_id) : null
      }))
    }))

    return NextResponse.json({
      success: true,
      tables: tablesWithGuests || []
    })

  } catch (error) {
    console.error('Error in tables API:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { event_id, name, capacity } = await request.json()

    if (!event_id || !name || !capacity) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event ID, name, and capacity are required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Create the table
    const { data: table, error } = await supabase
      .from('seating_tables')
      .insert({
        event_id,
        name,
        capacity: parseInt(capacity),
        pos_x: 0,
        pos_y: 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating table:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to create table' 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      table
    })

  } catch (error) {
    console.error('Error in create table API:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
