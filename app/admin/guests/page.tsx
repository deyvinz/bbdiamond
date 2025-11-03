import { getGuestsServer } from '@/lib/guests'
import { getAppConfig } from '@/lib/config-service'
import { getEventsPage } from '@/lib/events-service'
import GuestsClient from './GuestsClient'

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

// Force dynamic rendering to prevent build-time data fetching
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  let config
  let eventsResponse
  
  // Add timeout to prevent indefinite hanging
  const fetchWithTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 10000, fallback: T, name: string): Promise<T> => {
    const fetchStartTime = Date.now()
    console.log(`[${name}] Starting fetch...`)
    
    try {
      const timeoutPromise = new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      )
      
      const result = await Promise.race([promise, timeoutPromise])
      console.log(`[${name}] Completed in ${Date.now() - fetchStartTime}ms`)
      return result
    } catch (error) {
      console.error(`[${name}] Error or timeout after ${Date.now() - fetchStartTime}ms:`, error)
      return fallback
    }
  }

  try {
    console.log('[GuestsPage] Fetching data with filters:', filters, 'pagination:', pagination)
    const pageStartTime = Date.now()
    
    const results = await Promise.allSettled([
      fetchWithTimeout(
        getGuestsServer(filters, pagination),
        20000,
        {
          guests: [],
          total_count: 0,
          page: 1,
          page_size: 20,
          total_pages: 0
        },
        'getGuestsServer'
      ),
      fetchWithTimeout(getAppConfig(), 10000, null, 'getAppConfig'),
      fetchWithTimeout(getEventsPage(), 15000, { events: [], total_count: 0 }, 'getEventsPage')
    ])
    
    // Extract results from Promise.allSettled
    guestsData = results[0].status === 'fulfilled' ? results[0].value : {
      guests: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
    config = results[1].status === 'fulfilled' ? results[1].value : null
    eventsResponse = results[2].status === 'fulfilled' ? results[2].value : { events: [], total_count: 0 }
    
    console.log(`[GuestsPage] All fetches completed in ${Date.now() - pageStartTime}ms`)
    console.log(`[GuestsPage] Guests data:`, { count: guestsData.guests?.length || 0, total: guestsData.total_count })
  } catch (error) {
    console.error('[GuestsPage] Error fetching data:', error)
    guestsData = {
      guests: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
    config = null
    eventsResponse = { events: [], total_count: 0 }
  }

  const events = eventsResponse.events

  return (
    <GuestsClient
      initialGuests={guestsData.guests}
      totalCount={guestsData.total_count}
      page={guestsData.page}
      pageSize={guestsData.page_size}
      totalPages={guestsData.total_pages}
      config={config}
      events={events}
      initialFilters={{
        search: filters.search,
        rsvp_status: filters.rsvp_status,
        is_vip: filters.is_vip,
        sort_by: filters.sort_by,
        sort_order: filters.sort_order
      }}
    />
  )
}
