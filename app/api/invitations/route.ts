import { NextRequest, NextResponse } from 'next/server'
import { getInvitationsPage } from '@/lib/invitations-service'
import { invitationFiltersSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const filters = {
      q: searchParams.get('q') || undefined,
      eventId: searchParams.get('eventId') || undefined,
      status: searchParams.get('status') as any,
      dateFrom: searchParams.get('dateFrom') || undefined,
      dateTo: searchParams.get('dateTo') || undefined,
      sort: {
        column: searchParams.get('sort') || 'created_at',
        direction: (searchParams.get('direction') as 'asc' | 'desc') || 'desc'
      }
    }

    const pagination = {
      page: parseInt(searchParams.get('page') || '1'),
      page_size: parseInt(searchParams.get('pageSize') || '20')
    }

    // Validate filters
    const validatedFilters = invitationFiltersSchema.parse(filters)

    const result = await getInvitationsPage(validatedFilters, pagination)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    )
  }
}
