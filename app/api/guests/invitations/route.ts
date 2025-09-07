import { NextRequest, NextResponse } from 'next/server'
import { createInvitationForGuest } from '@/lib/guests-service-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guestId, eventId, headcount } = body
    
    if (!guestId || !eventId) {
      return NextResponse.json(
        { error: 'guestId and eventId are required' },
        { status: 400 }
      )
    }
    
    const invitation = await createInvitationForGuest(guestId, eventId, headcount || 1)
    return NextResponse.json(invitation)
  } catch (error) {
    console.error('Error creating invitation:', error)
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    )
  }
}
