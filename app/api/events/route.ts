import { NextRequest, NextResponse } from 'next/server'
import { getEventsPage, createEvent } from '@/lib/events-service'
import { createEventSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const { events, total_count } = await getEventsPage()
    return NextResponse.json({
      success: true,
      events,
      total_count
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createEventSchema.parse(body)
    
    const event = await createEvent(validatedData)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating event:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create event' },
      { status: 500 }
    )
  }
}
