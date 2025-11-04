import { NextRequest, NextResponse } from 'next/server'
import { getInvitationsPage } from '@/lib/invitations-service'
import { invitationFiltersSchema } from '@/lib/validators'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    
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

    const result = await getInvitationsPage(validatedFilters, pagination, weddingId)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch invitations'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
