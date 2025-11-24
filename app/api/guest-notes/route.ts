import { NextRequest, NextResponse } from 'next/server'
import { getWeddingContext } from '@/lib/wedding-context-server'
import {
  getApprovedGuestNotes,
  createGuestNote,
  type CreateGuestNoteInput,
} from '@/lib/guest-notes-service'

// GET - Get approved guest notes (public)
export async function GET(request: NextRequest) {
  try {
    const context = await getWeddingContext()
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Wedding not found' },
        { status: 404 }
      )
    }

    // Check if guest notes are enabled
    const { wedding } = context
    if (!wedding.enable_guest_notes) {
      return NextResponse.json(
        { success: false, error: 'Guest notes are not enabled for this wedding' },
        { status: 403 }
      )
    }

    const notes = await getApprovedGuestNotes(context.weddingId)

    return NextResponse.json({
      success: true,
      notes,
    })
  } catch (error) {
    console.error('Error in guest notes GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create guest note (public)
export async function POST(request: NextRequest) {
  try {
    const context = await getWeddingContext()
    
    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Wedding not found' },
        { status: 404 }
      )
    }

    // Check if guest notes are enabled
    const { wedding } = context
    if (!wedding.enable_guest_notes) {
      return NextResponse.json(
        { success: false, error: 'Guest notes are not enabled for this wedding' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { guest_id, guest_name, message } = body

    if (!message || !message.trim()) {
      return NextResponse.json(
        { success: false, error: 'Message is required' },
        { status: 400 }
      )
    }

    const noteData: CreateGuestNoteInput = {
      guest_id: guest_id || undefined,
      guest_name: guest_name?.trim() || undefined,
      message: message.trim(),
    }

    const note = await createGuestNote(noteData, context.weddingId)

    return NextResponse.json({
      success: true,
      note,
      message: 'Your note has been submitted and will be reviewed before being published.',
    }, { status: 201 })
  } catch (error) {
    console.error('Error in guest notes POST:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

