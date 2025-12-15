import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { format } from 'date-fns'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const searchParams = request.nextUrl.searchParams
    const eventId = searchParams.get('eventId')
    const status = searchParams.get('status')
    const columnsParam = searchParams.get('columns')

    if (!columnsParam) {
      return NextResponse.json(
        { error: 'No columns specified' },
        { status: 400 }
      )
    }

    const selectedColumns = columnsParam.split(',')
    const supabase = await supabaseServer()

    // Build the query (scoped to wedding)
    let query = supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        invite_code,
        dietary_restrictions,
        notes,
        created_at,
        invitations(
          id,
          invitation_events(
            id,
            status,
            headcount,
            dietary_restrictions,
            dietary_information,
            food_choice,
            event:events(
              id,
              name,
              starts_at
            ),
            rsvp_guests(
              id,
              guest_index,
              name,
              food_choice
            ).order('guest_index')
          )
        )
      `)
      .eq('wedding_id', weddingId)

    const { data: guests, error } = await query

    if (error) {
      console.error('Export query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch guests' },
        { status: 500 }
      )
    }

    // Transform data to CSV format
    const csvRows: string[][] = []

    // Add header row
    const headers: string[] = []
    if (selectedColumns.includes('first_name')) headers.push('First Name')
    if (selectedColumns.includes('last_name')) headers.push('Last Name')
    if (selectedColumns.includes('email')) headers.push('Email')
    if (selectedColumns.includes('invite_code')) headers.push('Invite Code')
    if (selectedColumns.includes('events')) headers.push('Events')
    if (selectedColumns.includes('rsvp_status')) headers.push('RSVP Status')
    if (selectedColumns.includes('headcount')) headers.push('Headcount')
    if (selectedColumns.includes('dietary_restrictions')) headers.push('Dietary Restrictions')
    if (selectedColumns.includes('dietary_information')) headers.push('Dietary Information')
    if (selectedColumns.includes('food_choice')) headers.push('Food Choice')
    if (selectedColumns.includes('notes')) headers.push('Notes')
    if (selectedColumns.includes('created_at')) headers.push('Created Date')

    csvRows.push(headers)

    // Add data rows
    for (const guest of guests || []) {
      const invitations = (guest.invitations || []) as any[]
      
      // Collect all invitation events
      const allInvitationEvents: any[] = []
      for (const invitation of invitations) {
        const invitationEvents = (invitation.invitation_events || []) as any[]
        allInvitationEvents.push(...invitationEvents)
      }

      // Sort events by start date
      const sortedEvents = allInvitationEvents.sort((a, b) => {
        const dateA = a.event?.starts_at ? new Date(a.event.starts_at).getTime() : 0
        const dateB = b.event?.starts_at ? new Date(b.event.starts_at).getTime() : 0
        return dateA - dateB
      })

      // Apply filters
      let filteredEvents = sortedEvents

      if (eventId && eventId !== 'all') {
        filteredEvents = filteredEvents.filter(ie => ie.event?.id === eventId)
      }

      if (status && status !== 'all') {
        filteredEvents = filteredEvents.filter(ie => ie.status === status)
      }

      // Skip guest if no events match filters
      if ((eventId !== 'all' || status !== 'all') && filteredEvents.length === 0) {
        continue
      }

      // Create a row for each event (or one row if no events)
      if (filteredEvents.length === 0) {
        const row: string[] = []
        if (selectedColumns.includes('first_name')) row.push(guest.first_name || '')
        if (selectedColumns.includes('last_name')) row.push(guest.last_name || '')
        if (selectedColumns.includes('email')) row.push(guest.email || '')
        if (selectedColumns.includes('invite_code')) row.push(guest.invite_code || '')
        if (selectedColumns.includes('events')) row.push('')
        if (selectedColumns.includes('rsvp_status')) row.push('')
        if (selectedColumns.includes('headcount')) row.push('')
        if (selectedColumns.includes('dietary_restrictions')) row.push('')
        if (selectedColumns.includes('dietary_information')) row.push('')
        if (selectedColumns.includes('food_choice')) row.push('')
        if (selectedColumns.includes('notes')) row.push(guest.notes || '')
        if (selectedColumns.includes('created_at')) {
          row.push(guest.created_at ? format(new Date(guest.created_at), 'yyyy-MM-dd HH:mm:ss') : '')
        }
        csvRows.push(row)
      } else {
        for (const invEvent of filteredEvents) {
          // Handle multiple guest food choices
          const rsvpGuests = (invEvent.rsvp_guests || []) as any[]
          
          if (rsvpGuests.length > 0) {
            // Create a row for each guest with food choice
            for (const rsvpGuest of rsvpGuests) {
              const row: string[] = []
              if (selectedColumns.includes('first_name')) {
                // For primary guest, use guest name; for plus-ones, use rsvp_guest name
                row.push(rsvpGuest.guest_index === 1 ? guest.first_name || '' : rsvpGuest.name || '')
              }
              if (selectedColumns.includes('last_name')) {
                row.push(rsvpGuest.guest_index === 1 ? guest.last_name || '' : '')
              }
              if (selectedColumns.includes('email')) row.push(guest.email || '')
              if (selectedColumns.includes('invite_code')) row.push(guest.invite_code || '')
              if (selectedColumns.includes('events')) row.push(invEvent.event?.name || '')
              if (selectedColumns.includes('rsvp_status')) row.push(invEvent.status || 'pending')
              if (selectedColumns.includes('headcount')) row.push(invEvent.headcount?.toString() || '1')
              if (selectedColumns.includes('dietary_restrictions')) row.push(invEvent.dietary_restrictions || '')
              if (selectedColumns.includes('dietary_information')) row.push(invEvent.dietary_information || '')
              if (selectedColumns.includes('food_choice')) {
                const guestLabel = rsvpGuest.guest_index === 1 
                  ? 'Primary Guest' 
                  : `Guest ${rsvpGuest.guest_index}${rsvpGuest.name ? ` (${rsvpGuest.name})` : ''}`
                row.push(`${guestLabel}: ${rsvpGuest.food_choice || ''}`)
              }
              if (selectedColumns.includes('notes')) row.push(guest.notes || '')
              if (selectedColumns.includes('created_at')) {
                row.push(guest.created_at ? format(new Date(guest.created_at), 'yyyy-MM-dd HH:mm:ss') : '')
              }
              csvRows.push(row)
            }
          } else {
            // Fallback to single food_choice (backward compatibility)
            const row: string[] = []
            if (selectedColumns.includes('first_name')) row.push(guest.first_name || '')
            if (selectedColumns.includes('last_name')) row.push(guest.last_name || '')
            if (selectedColumns.includes('email')) row.push(guest.email || '')
            if (selectedColumns.includes('invite_code')) row.push(guest.invite_code || '')
            if (selectedColumns.includes('events')) row.push(invEvent.event?.name || '')
            if (selectedColumns.includes('rsvp_status')) row.push(invEvent.status || 'pending')
            if (selectedColumns.includes('headcount')) row.push(invEvent.headcount?.toString() || '1')
            if (selectedColumns.includes('dietary_restrictions')) row.push(invEvent.dietary_restrictions || '')
            if (selectedColumns.includes('dietary_information')) row.push(invEvent.dietary_information || '')
            if (selectedColumns.includes('food_choice')) row.push(invEvent.food_choice || '')
            if (selectedColumns.includes('notes')) row.push(guest.notes || '')
            if (selectedColumns.includes('created_at')) {
              row.push(guest.created_at ? format(new Date(guest.created_at), 'yyyy-MM-dd HH:mm:ss') : '')
            }
            csvRows.push(row)
          }
        }
      }
    }

    // Convert to CSV string
    const csvContent = csvRows
      .map(row =>
        row.map(cell => {
          // Escape quotes and wrap in quotes if contains comma, quote, or newline
          const cellStr = cell.toString()
          if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
            return `"${cellStr.replace(/"/g, '""')}"`
          }
          return cellStr
        }).join(',')
      )
      .join('\n')

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="guests-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

