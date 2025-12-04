import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('event_id')

    if (!eventId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event ID is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // First verify the event belongs to this wedding
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, wedding_id')
      .eq('id', eventId)
      .eq('wedding_id', weddingId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event not found or access denied' 
      }, { status: 403 })
    }

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

    // Fetch guest data separately (scoped to this wedding)
    let guests: any[] = []
    if (guestIds.size > 0) {
      const { data: guestsData, error: guestsError } = await supabase
        .from('guests')
        .select('id, first_name, last_name, email, invite_code')
        .in('id', Array.from(guestIds))
        .eq('wedding_id', weddingId)

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
    const weddingId = await requireWeddingId(request)
    const { event_id, name, capacity } = await request.json()

    if (!event_id || !name || !capacity) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event ID, name, and capacity are required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Verify the event belongs to this wedding
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, wedding_id')
      .eq('id', event_id)
      .eq('wedding_id', weddingId)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ 
        success: false, 
        message: 'Event not found or access denied' 
      }, { status: 403 })
    }

    // Create the table (include wedding_id for multi-tenant support)
    const { data: table, error } = await supabase
      .from('seating_tables')
      .insert({
        event_id,
        wedding_id: weddingId,
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

    // Invalidate cache to refresh seating data
    await bumpNamespaceVersion()

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
