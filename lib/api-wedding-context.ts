import { NextRequest } from 'next/server'
import { getWeddingId } from './wedding-context'

/**
 * Get wedding ID from API request
 * Tries multiple sources: header, cookie, query param, then context
 * Does NOT consume the request body to avoid conflicts
 */
export async function getWeddingIdFromRequest(request: NextRequest): Promise<string | null> {
  // 1. Try from header (set by middleware)
  const weddingIdHeader = request.headers.get('x-wedding-id')
  if (weddingIdHeader) {
    return weddingIdHeader
  }

  // 2. Try from cookie (set by middleware)
  const weddingIdCookie = request.cookies.get('wedding_id')?.value
  if (weddingIdCookie) {
    return weddingIdCookie
  }

  // 3. Try from query parameter (for public routes)
  const url = new URL(request.url)
  const weddingIdQuery = url.searchParams.get('wedding_id')
  if (weddingIdQuery) {
    return weddingIdQuery
  }

  // 4. Fall back to context resolution (domain-based)
  try {
    return await getWeddingId()
  } catch {
    return null
  }
}

/**
 * Get wedding ID from API request and throw if not found
 */
export async function requireWeddingId(request: NextRequest): Promise<string> {
  const weddingId = await getWeddingIdFromRequest(request)
  if (!weddingId) {
    throw new Error('Wedding ID is required')
  }
  return weddingId
}

/**
 * Get wedding ID from request body (use when body is already parsed)
 */
export function getWeddingIdFromBody(body: any): string | null {
  return body?.wedding_id || null
}

