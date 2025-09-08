import { NextRequest, NextResponse } from 'next/server'
import { createGuest } from '@/lib/guests-service-server'
import { getGuestsServer } from '@/lib/guests'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
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

    const result = await getGuestsServer(filters, pagination)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching guests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch guests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const guest = await createGuest(body)
    return NextResponse.json(guest)
  } catch (error) {
    console.error('Error creating guest:', error)
    return NextResponse.json(
      { error: 'Failed to create guest' },
      { status: 500 }
    )
  }
}
