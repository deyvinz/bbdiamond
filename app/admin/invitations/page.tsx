import { getInvitationsPage } from '@/lib/invitations-service'
import { getAppConfig } from '@/lib/config-service'
import { getEventsPage } from '@/lib/events-service'
import { DEFAULT_CONFIG } from '@/lib/types/config'
import InvitationsClient from './InvitationsClient'

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

// Force dynamic rendering to prevent build-time data fetching
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
  let eventsResponse
  
  // Add timeout to prevent indefinite hanging
  const fetchWithTimeout = async <T,>(promise: Promise<T>, timeoutMs: number = 10000, fallback: T, name: string): Promise<T> => {
    const fetchStartTime = Date.now()
    
    try {
      const timeoutPromise = new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs)
      )
      
      const result = await Promise.race([promise, timeoutPromise])
      return result
    } catch (error) {
      console.error(`[${name}] Error or timeout after ${Date.now() - fetchStartTime}ms:`, error)
      return fallback
    }
  }
  
  try {
    const pageStartTime = Date.now()
    
    const results = await Promise.allSettled([
      fetchWithTimeout(
        getInvitationsPage(filters, pagination),
        20000,
        {
          invitations: [],
          total_count: 0,
          page: 1,
          page_size: 20,
          total_pages: 0
        },
        'getInvitationsPage'
      ),
      fetchWithTimeout(getAppConfig(), 10000, null, 'getAppConfig'),
      fetchWithTimeout(getEventsPage(), 15000, { events: [], total_count: 0 }, 'getEventsPage')
    ])
    
    // Extract results from Promise.allSettled
    invitationsData = results[0].status === 'fulfilled' ? results[0].value : {
      invitations: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
    config = results[1].status === 'fulfilled' ? results[1].value : DEFAULT_CONFIG
    eventsResponse = results[2].status === 'fulfilled' ? results[2].value : { events: [], total_count: 0 }
    
  } catch (error) {
    console.error('[InvitationsPage] Error fetching data:', error)
    invitationsData = {
      invitations: [],
      total_count: 0,
      page: 1,
      page_size: 20,
      total_pages: 0
    }
    config = DEFAULT_CONFIG
    eventsResponse = { events: [], total_count: 0 }
  }

  const events = eventsResponse.events

  return (
    <InvitationsClient
      initialInvitations={invitationsData.invitations}
      totalCount={invitationsData.total_count}
      page={invitationsData.page}
      pageSize={invitationsData.page_size}
      totalPages={invitationsData.total_pages}
      config={config || undefined}
      events={events}
      initialFilters={{
        q: filters.q,
        eventId: filters.eventId,
        status: filters.status,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        sort: filters.sort
      }}
    />
  )
}
