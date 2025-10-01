import { GuestListResponse, Guest } from './types/guests'

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

export async function getGuestsPage(params: GuestsListParams): Promise<GuestListResponse> {
  const searchParams = new URLSearchParams({
    page: params.page.toString(),
    pageSize: params.pageSize.toString(),
    ...(params.q && { q: params.q }),
    ...(params.status && { status: params.status }),
    ...(params.vip !== undefined && { vip: params.vip.toString() }),
    sortColumn: params.sort?.column || 'name',
    sortDirection: params.sort?.direction || 'asc'
  })

  const response = await fetch(`/api/guests?${searchParams}`)
  if (!response.ok) {
    throw new Error('Failed to fetch guests')
  }
  
  return response.json()
}

export async function createGuest(input: Partial<Guest>): Promise<Guest> {
  const response = await fetch('/api/guests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create guest')
  }

  return response.json()
}

export async function updateGuest(id: string, patch: Partial<Guest>): Promise<Guest> {
  const response = await fetch(`/api/guests/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(patch),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update guest')
  }

  return response.json()
}

export async function deleteGuest(id: string): Promise<boolean> {
  const response = await fetch(`/api/guests/${id}`, {
    method: 'DELETE',
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete guest')
  }

  return true
}


export async function bulkInvalidateGuests(): Promise<void> {
  // For bulk operations like CSV import, this is handled server-side
  // No client-side action needed
}
