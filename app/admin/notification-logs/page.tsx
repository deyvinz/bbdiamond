import NotificationLogsClient from './NotificationLogsClient'

interface NotificationLogsPageProps {
  searchParams: Promise<{
    page?: string
    channel?: string
    status?: string
    date_from?: string
    date_to?: string
    search?: string
    log_type?: string
  }>
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function NotificationLogsPage({ searchParams }: NotificationLogsPageProps) {
  const resolvedSearchParams = await searchParams
  const page = parseInt(resolvedSearchParams.page || '1', 10)

  return (
    <NotificationLogsClient
      initialPage={page}
      initialFilters={{
        channel: resolvedSearchParams.channel,
        status: resolvedSearchParams.status,
        date_from: resolvedSearchParams.date_from,
        date_to: resolvedSearchParams.date_to,
        search: resolvedSearchParams.search,
        log_type: (resolvedSearchParams.log_type || 'all') as 'mail' | 'notification' | 'all',
      }}
    />
  )
}
