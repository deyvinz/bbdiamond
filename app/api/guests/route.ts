import { NextRequest, NextResponse } from 'next/server'
import { createGuest } from '@/lib/guests-service-server'
import { getGuestsServer, getGuestsWithoutInvitations } from '@/lib/guests'
import { requireWeddingId, getWeddingIdFromBody } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    
    const { searchParams } = new URL(request.url)
    
    // Check if we need to filter guests without invitations
    const withoutInvitations = searchParams.get('without_invitations') === 'true'
    
    if (withoutInvitations) {
      // Use specialized function for guests without invitations
      const pagination = {
        page: parseInt(searchParams.get('page') || '1'),
        page_size: parseInt(searchParams.get('pageSize') || '1000')
      }
      const result = await getGuestsWithoutInvitations(pagination, weddingId)
      return NextResponse.json(result)
    }
    
    const filters = {
      search: searchParams.get('q') || undefined,
      rsvp_status: searchParams.get('status') as any,
      is_vip: searchParams.get('vip') === 'true' ? true : searchParams.get('vip') === 'false' ? false : undefined,
      sort_by: (searchParams.get('sortColumn') as any) || 'name',
      sort_order: (searchParams.get('sortDirection') as any) || 'asc'
    }

    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      page_size: parseInt(searchParams.get('pageSize') || '20')
    }

    const result = await getGuestsServer(filters, pagination, weddingId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching guests:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch guests'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const weddingId = getWeddingIdFromBody(body) || await requireWeddingId(request)
    
    const guest = await createGuest(body, weddingId)
    return NextResponse.json(guest)
  } catch (error) {
    console.error('Error creating guest:', error)
    const message = error instanceof Error ? error.message : 'Failed to create guest'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
