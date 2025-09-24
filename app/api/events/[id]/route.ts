import { NextRequest, NextResponse } from 'next/server'
import { getEventById, updateEvent, deleteEvent } from '@/lib/events-service'
import { updateEventSchema } from '@/lib/validators'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const event = await getEventById(id)
    return NextResponse.json(event)
  } catch (error) {
    console.error('Error fetching event:', error)
    
    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
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
    
    const event = await updateEvent(id, validatedData)
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
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update event' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await deleteEvent(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting event:', error)
    
    if (error instanceof Error && error.message === 'Event not found') {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete event' },
      { status: 500 }
    )
  }
}
