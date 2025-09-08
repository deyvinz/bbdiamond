import { Suspense } from 'react'
import { getInvitationsPage } from '@/lib/invitations-service'
import InvitationsClient from './InvitationsClient'
import { CardSkeleton } from '@/components/ui/skeleton'

interface InvitationsPageProps {
  searchParams: Promise<{
    page?: string
    q?: string
    eventId?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    sort?: string
    direction?: string
  }>
}

export default async function InvitationsPage({ searchParams }: InvitationsPageProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1')

  const filters = {
    q: resolvedSearchParams.q,
    eventId: resolvedSearchParams.eventId,
    status: resolvedSearchParams.status as any,
    dateFrom: resolvedSearchParams.dateFrom,
    dateTo: resolvedSearchParams.dateTo,
    sort: {
      column: resolvedSearchParams.sort || 'created_at',
      direction: (resolvedSearchParams.direction as 'asc' | 'desc') || 'desc'
    }
  }

  const pagination = {
    page,
    page_size: 20
  }

  let invitationsData
  try {
    invitationsData = await getInvitationsPage(filters, pagination)
  } catch (error) {
    console.error('Error fetching invitations:', error)
    invitationsData = {
      invitations: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gold-700">Invitations</h1>
          <p className="text-gray-600 mt-1">
            Manage wedding invitations and RSVPs
          </p>
        </div>
      </div>

      <Suspense fallback={
        <div className="space-y-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      }>
        <InvitationsClient
          initialInvitations={invitationsData.invitations}
          totalCount={invitationsData.total_count}
          page={invitationsData.page}
          pageSize={invitationsData.page_size}
          totalPages={invitationsData.total_pages}
          initialFilters={{
            q: filters.q,
            eventId: filters.eventId,
            status: filters.status,
            dateFrom: filters.dateFrom,
            dateTo: filters.dateTo,
            sort: filters.sort
          }}
        />
      </Suspense>
    </div>
  )
}
