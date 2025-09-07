import { Suspense } from 'react'
import { getGuestsPage } from '@/lib/guests-service-server'
import GuestsClient from './GuestsClient'
import { CardSkeleton } from '@/components/ui/skeleton'

interface GuestsPageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    rsvp_status?: string
    is_vip?: string
    sort_by?: string
    sort_order?: string
  }>
}

export default async function GuestsPage({ searchParams }: GuestsPageProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1')
  
  const params = {
    page,
    pageSize: 20,
    q: resolvedSearchParams.search,
    status: resolvedSearchParams.rsvp_status,
    vip: resolvedSearchParams.is_vip === 'true' ? true : resolvedSearchParams.is_vip === 'false' ? false : undefined,
    sort: {
      column: resolvedSearchParams.sort_by || 'name',
      direction: (resolvedSearchParams.sort_order as 'asc' | 'desc') || 'asc'
    }
  }

  let guestsData
  try {
    guestsData = await getGuestsPage(params)
  } catch (error) {
    console.error('Error fetching guests:', error)
    guestsData = {
      guests: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
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
      <GuestsClient
        initialGuests={guestsData.guests}
        totalCount={guestsData.total_count}
        page={guestsData.page}
        pageSize={guestsData.page_size}
        totalPages={guestsData.total_pages}
        initialFilters={{
          search: params.q,
          rsvp_status: params.status as any,
          is_vip: params.vip,
          sort_by: params.sort.column as any,
          sort_order: params.sort.direction
        }}
      />
    </Suspense>
  )
}
