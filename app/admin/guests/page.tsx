import { Suspense } from 'react'
import { getGuestsServer } from '@/lib/guests'
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
  
  const filters = {
    search: resolvedSearchParams.search,
    rsvp_status: resolvedSearchParams.rsvp_status as any,
    is_vip: resolvedSearchParams.is_vip === 'true' ? true : resolvedSearchParams.is_vip === 'false' ? false : undefined,
    sort_by: resolvedSearchParams.sort_by as any || 'name',
    sort_order: resolvedSearchParams.sort_order as any || 'asc'
  }

  const pagination = {
    page,
    page_size: 20
  }

  let guestsData
  try {
    guestsData = await getGuestsServer(filters, pagination)
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
          search: filters.search,
          rsvp_status: filters.rsvp_status,
          is_vip: filters.is_vip,
          sort_by: filters.sort_by,
          sort_order: filters.sort_order
        }}
      />
    </Suspense>
  )
}
