import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  getAllGuestNotes,
  updateGuestNote,
  deleteGuestNote,
} from '@/lib/guest-notes-service'

// GET - Get all guest notes (including unapproved) for admin
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const notes = await getAllGuestNotes(weddingId)

    return NextResponse.json({
      success: true,
      notes,
    })
  } catch (error) {
    console.error('Error in admin guest notes GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

