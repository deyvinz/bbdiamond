// Client-side cache invalidation
// This file provides cache invalidation functions that work in the browser

/**
 * Client-side cache invalidation
 * Since we can't access Redis directly from the client,
 * we'll make an API call to invalidate the server-side cache
 */
export async function bumpNamespaceVersion(): Promise<void> {
  try {
    const response = await fetch('/api/admin/cache/invalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      console.warn('Failed to invalidate cache:', response.statusText)
    }
  } catch (error) {
    console.warn('Cache invalidation failed:', error)
    // Don't throw - cache invalidation failure shouldn't break the operation
  }
}
