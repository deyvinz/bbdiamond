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
      .from('invitations')
      .select(`
        id,
        token,
        created_at,
        guest:guests!inner(
          id,
          first_name,
          last_name,
          email,
          invite_code
        ),
        invitation_events(
          id,
          status,
          headcount,
          event:events(
            id,
            name,
            starts_at
          )
        )
      `)
      .eq('wedding_id', weddingId)

    // Apply filters
    if (eventId && eventId !== 'all') {
      query = query.eq('invitation_events.event_id', eventId)
    }

    if (status && status !== 'all') {
      query = query.eq('invitation_events.status', status)
    }

    const { data: invitations, error } = await query

    if (error) {
      console.error('Export query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invitations' },
        { status: 500 }
      )
    }

    // Transform data to CSV format
    const csvRows: string[][] = []

    // Add header row
    const headers: string[] = []
    if (selectedColumns.includes('guest_name')) headers.push('Guest Name')
    if (selectedColumns.includes('email')) headers.push('Email')
    if (selectedColumns.includes('invite_code')) headers.push('Invite Code')
    if (selectedColumns.includes('events')) headers.push('Events')
    if (selectedColumns.includes('rsvp_status')) headers.push('RSVP Status')
    if (selectedColumns.includes('headcount')) headers.push('Headcount')
    if (selectedColumns.includes('token')) headers.push('Invitation Token')
    if (selectedColumns.includes('created_at')) headers.push('Created Date')

    csvRows.push(headers)

    // Add data rows
    for (const invitation of invitations || []) {
      const guest = invitation.guest as any
      const invitationEvents = (invitation.invitation_events || []) as any[]

      // Sort events by start date
      const sortedEvents = invitationEvents.sort((a, b) => {
        const dateA = a.event?.starts_at ? new Date(a.event.starts_at).getTime() : 0
        const dateB = b.event?.starts_at ? new Date(b.event.starts_at).getTime() : 0
        return dateA - dateB
      })

      // If filtering by event, only include matching events
      const filteredEvents = eventId && eventId !== 'all'
        ? sortedEvents.filter(ie => ie.event?.id === eventId)
        : sortedEvents

      // Create a row for each event (or one row if no events)
      if (filteredEvents.length === 0) {
        const row: string[] = []
        if (selectedColumns.includes('guest_name')) {
          row.push(`${guest?.first_name || ''} ${guest?.last_name || ''}`.trim())
        }
        if (selectedColumns.includes('email')) row.push(guest?.email || '')
        if (selectedColumns.includes('invite_code')) row.push(guest?.invite_code || '')
        if (selectedColumns.includes('events')) row.push('')
        if (selectedColumns.includes('rsvp_status')) row.push('')
        if (selectedColumns.includes('headcount')) row.push('')
        if (selectedColumns.includes('token')) row.push(invitation.token || '')
        if (selectedColumns.includes('created_at')) {
          row.push(invitation.created_at ? format(new Date(invitation.created_at), 'yyyy-MM-dd HH:mm:ss') : '')
        }
        csvRows.push(row)
      } else {
        for (const invEvent of filteredEvents) {
          const row: string[] = []
          if (selectedColumns.includes('guest_name')) {
            row.push(`${guest?.first_name || ''} ${guest?.last_name || ''}`.trim())
          }
          if (selectedColumns.includes('email')) row.push(guest?.email || '')
          if (selectedColumns.includes('invite_code')) row.push(guest?.invite_code || '')
          if (selectedColumns.includes('events')) row.push(invEvent.event?.name || '')
          if (selectedColumns.includes('rsvp_status')) row.push(invEvent.status || 'pending')
          if (selectedColumns.includes('headcount')) row.push(invEvent.headcount?.toString() || '1')
          if (selectedColumns.includes('token')) row.push(invitation.token || '')
          if (selectedColumns.includes('created_at')) {
            row.push(invitation.created_at ? format(new Date(invitation.created_at), 'yyyy-MM-dd HH:mm:ss') : '')
          }
          csvRows.push(row)
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
        'Content-Disposition': `attachment; filename="invitations-export-${new Date().toISOString().split('T')[0]}.csv"`,
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

