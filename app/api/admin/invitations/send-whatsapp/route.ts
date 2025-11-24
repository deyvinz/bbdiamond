import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import { sendInviteWhatsApp } from '@/lib/invitations-service'

export async function POST(request: NextRequest) {
  try {
    await requireWeddingId(request)
    const body = await request.json()
    const { invitationId, eventIds, phoneNumber, ignoreRateLimit } = body

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one event ID is required' },
        { status: 400 }
      )
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const result = await sendInviteWhatsApp({
      invitationId,
      eventIds,
      phoneNumber: phoneNumber.trim(),
      ignoreRateLimit: ignoreRateLimit || false,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in send WhatsApp route:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

