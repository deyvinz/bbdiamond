export interface WeddingContext {
  weddingId: string
  wedding: {
    id: string
    slug: string
    bride_name: string
    groom_name: string
    couple_display_name: string
    hashtag?: string | null
    primary_date: string
    venue_name: string
    city: string
    country: string
    contact_email: string
    custom_domain?: string | null
    subdomain?: string | null
    enable_gallery?: boolean
    enable_registry?: boolean
    enable_travel?: boolean
    enable_wedding_party?: boolean
    enable_faq?: boolean
    enable_seating?: boolean
    enable_guest_notes?: boolean
    enable_things_to_do?: boolean
    show_dietary_restrictions?: boolean
    show_additional_dietary_info?: boolean
    rsvp_banner_days_before?: number
    registry_url?: string | null
    travel_url?: string | null
    gallery_url?: string | null
  }
}

const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'saas'
const DEFAULT_WEDDING_ID = process.env.DEFAULT_WEDDING_ID // For self-hosted mode

/**
 * Client-side helper to get wedding ID from cookies or URL/search params
 * Used in client components where server headers aren't available
 * 
 * Priority:
 * 1. Self-hosted mode: Use DEFAULT_WEDDING_ID from env
 * 2. Cookie (set by middleware) - primary method for client components
 * 3. URL search params (for testing/debugging)
 */
export function getWeddingIdFromClient(): string | null {
  // Self-hosted mode
  if (typeof window !== 'undefined' && DEPLOYMENT_MODE === 'self-hosted' && DEFAULT_WEDDING_ID) {
    return DEFAULT_WEDDING_ID
  }

  if (typeof window === 'undefined') {
    return null
  }

  // Try to get from cookie (set by middleware)
  // This is the primary method for client components
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=')
    acc[key] = value
    return acc
  }, {} as Record<string, string>)
  
  const cookieWeddingId = cookies['wedding_id']
  if (cookieWeddingId) {
    return cookieWeddingId
  }

  // Try URL search params (for testing/debugging)
  const params = new URLSearchParams(window.location.search)
  const weddingId = params.get('wedding_id')
  if (weddingId) {
    return weddingId
  }

  return null
}

