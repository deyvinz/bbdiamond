import { Suspense } from 'react'
import { getInvitationsPage } from '@/lib/invitations-service'
import { getAppConfig } from '@/lib/config-service'
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
  let config
  try {
    [invitationsData, config] = await Promise.all([
      getInvitationsPage(filters, pagination),
      getAppConfig()
    ])
  } catch (error) {
    console.error('Error fetching data:', error)
    invitationsData = {
      invitations: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
    config = {
      plus_ones_enabled: false,
      max_party_size: 1,
      allow_guest_plus_ones: false,
      rsvp_enabled: true,
      rsvp_cutoff_date: undefined,
      rsvp_cutoff_timezone: 'America/New_York',
    }
  }

  return (
    <Suspense fallback={
      <div className="grid gap-4 py-8">
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
        config={config}
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
  )
}
