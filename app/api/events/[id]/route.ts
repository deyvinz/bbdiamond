import { NextRequest, NextResponse } from 'next/server'
import { getEventById, updateEvent, deleteEvent } from '@/lib/events-service'
import { updateEventSchema } from '@/lib/validators'
import { requireWeddingId, getWeddingIdFromBody } from '@/lib/api-wedding-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    
    const event = await getEventById(id, weddingId)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    
    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    const message = error instanceof Error ? error.message : 'Failed to fetch event'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    
    // Validate input
    const validatedData = updateEventSchema.parse(body)
    
    const weddingId = getWeddingIdFromBody(body) || await requireWeddingId(request)
    const event = await updateEvent(id, validatedData, weddingId)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error updating event:', error)
    
    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }
    
    const message = error instanceof Error ? error.message : 'Failed to update event'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    
    await deleteEvent(id, weddingId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    
    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    const message = error instanceof Error ? error.message : 'Failed to delete event'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
