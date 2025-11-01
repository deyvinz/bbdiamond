import { NextRequest, NextResponse } from 'next/server'
import { getEventsPage, createEvent } from '@/lib/events-service'
import { createEventSchema } from '@/lib/validators'
import { requireWeddingId, getWeddingIdFromBody } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const { events, total_count } = await getEventsPage(weddingId)
    return NextResponse.json({
      success: true,
      events,
      total_count
    })
  } catch (error) {
    console.error('Error fetching events:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch events'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { success: false, error: message },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = createEventSchema.parse(body)
    
    const weddingId = getWeddingIdFromBody(body) || await requireWeddingId(request)
    const event = await createEvent(validatedData, weddingId)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error creating event:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }
    
    const message = error instanceof Error ? error.message : 'Failed to create event'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
