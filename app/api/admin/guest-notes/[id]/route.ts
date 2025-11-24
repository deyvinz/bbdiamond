import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  updateGuestNote,
  deleteGuestNote,
} from '@/lib/guest-notes-service'

// PUT - Update guest note (approve/reject)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params
    const body = await request.json()
    const { is_approved } = body

    if (is_approved === undefined) {
      return NextResponse.json(
        { success: false, error: 'is_approved is required' },
        { status: 400 }
      )
    }

    const note = await updateGuestNote(id, { is_approved }, weddingId)

    return NextResponse.json({
      success: true,
      note,
    })
  } catch (error) {
    console.error('Error in admin guest notes PUT:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Guest note not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

// DELETE - Delete guest note
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params

    await deleteGuestNote(id, weddingId)

    return NextResponse.json({
      success: true,
      message: 'Guest note deleted successfully',
    })
  } catch (error) {
    console.error('Error in admin guest notes DELETE:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'Guest note not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

