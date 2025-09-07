import { NextRequest, NextResponse } from 'next/server'
import { createGuest, getGuestsPage } from '@/lib/guests-service-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const params = {
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20'),
      q: searchParams.get('q') || undefined,
      status: searchParams.get('status') || undefined,
      vip: searchParams.get('vip') === 'true' ? true : searchParams.get('vip') === 'false' ? false : undefined,
      sort: {
        column: searchParams.get('sortColumn') || 'name',
        direction: (searchParams.get('sortDirection') as 'asc' | 'desc') || 'asc'
      }
    }

    const result = await getGuestsPage(params)
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
