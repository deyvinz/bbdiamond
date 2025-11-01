import { NextRequest, NextResponse } from 'next/server'
import { updateGuest, deleteGuest } from '@/lib/guests-service-server'
import { requireWeddingId, getWeddingIdFromBody } from '@/lib/api-wedding-context'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json()
    const resolvedParams = await params
    const weddingId = getWeddingIdFromBody(body) || await requireWeddingId(request)
    
    const guest = await updateGuest(resolvedParams.id, body, weddingId)
    return NextResponse.json(guest)
  } catch (error) {
    console.error('Error updating guest:', error)
    const message = error instanceof Error ? error.message : 'Failed to update guest'
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
    const resolvedParams = await params
    const weddingId = await requireWeddingId(request)
    
    await deleteGuest(resolvedParams.id, weddingId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting guest:', error)
    const message = error instanceof Error ? error.message : 'Failed to delete guest'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
