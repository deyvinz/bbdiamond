export interface GuestsListParams {
  page: number
  pageSize: number
  q?: string
  status?: string
  vip?: boolean
  sort?: {
    column: string
    direction: 'asc' | 'desc'
  }
}

export function guestsListKey(params: GuestsListParams): string {
  // Normalize and sort parameters for deterministic keys
  const normalized = {
    page: params.page || 1,
    pageSize: params.pageSize || 10,
    q: params.q?.trim().toLowerCase() || '',
    status: params.status || '',
    vip: params.vip === true ? 'true' : params.vip === false ? 'false' : '',
    sort: params.sort ? `${params.sort.column}:${params.sort.direction}` : 'created_at:desc'
  }

  // Create deterministic key by sorting object keys
  const keyParts = Object.entries(normalized)
    .filter(([_, value]) => value !== '')
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)

  return `guests:list:${keyParts.join(':')}`
}

export function guestDetailKey(guestId: string): string {
  return `guests:detail:${guestId}`
}

export function guestInvitationsKey(guestId: string): string {
  return `guests:invitations:${guestId}`
}

export function eventGuestsKey(eventId: string): string {
  return `events:guests:${eventId}`
}

export function householdGuestsKey(householdId: string): string {
  return `households:guests:${householdId}`
}

// Helper to generate common filter combinations for bulk invalidation
export function getCommonGuestListKeys(): string[] {
  const commonFilters = [
    { page: 1, pageSize: 10 },
    { page: 1, pageSize: 25 },
    { page: 1, pageSize: 50 },
    { page: 2, pageSize: 10 },
    { page: 2, pageSize: 25 },
  ]

  const commonSorts = [
    { column: 'created_at', direction: 'desc' as const },
    { column: 'first_name', direction: 'asc' as const },
    { column: 'last_name', direction: 'asc' as const },
    { column: 'email', direction: 'asc' as const },
  ]

  const commonStatuses = ['', 'pending', 'accepted', 'declined', 'waitlist']
  const commonVipStates = ['', 'true', 'false']

  const keys: string[] = []
  
  for (const filter of commonFilters) {
    for (const sort of commonSorts) {
      for (const status of commonStatuses) {
        for (const vip of commonVipStates) {
          keys.push(guestsListKey({
            ...filter,
            sort,
            status: status || undefined,
            vip: vip === 'true' ? true : vip === 'false' ? false : undefined
          }))
        }
      }
    }
  }

  return keys
}
