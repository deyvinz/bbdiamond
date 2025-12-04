import { NextRequest } from 'next/server'
import { getWeddingId } from './wedding-context-server'
import { getUserWeddings } from './auth/wedding-access'
import { supabaseServer } from './supabase-server'

/**
 * Get wedding ID from API request
 * Tries multiple sources: header, cookie, query param, context, then user's weddings
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
    const domainWeddingId = await getWeddingId()
    if (domainWeddingId) {
      return domainWeddingId
    }
  } catch {
    // Continue to next fallback
  }

  // 5. For admin routes, try to get wedding ID from authenticated user's wedding ownership
  // This handles cases where admin routes are accessed from main domain (luwani.com)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) {
    try {
      const supabase = await supabaseServer()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const userWeddings = await getUserWeddings(user.id)
        // Return the first wedding if user owns any weddings
        // In most cases, users will have one wedding, but if they have multiple,
        // we'll use the first one (could be enhanced to use a selected/default wedding)
        if (userWeddings.length > 0) {
          return userWeddings[0]
        }
      }
    } catch (error) {
      console.error('Error getting wedding ID from user ownership:', error)
      // Continue and return null
    }
  }

  return null
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

