import { headers } from 'next/headers'
import { supabaseService } from './supabase-service'
import { cookies } from 'next/headers'

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
    registry_url?: string | null
    travel_url?: string | null
    gallery_url?: string | null
  }
}

const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'saas'
const DEFAULT_WEDDING_ID = process.env.DEFAULT_WEDDING_ID // For self-hosted mode

/**
 * Resolve wedding ID from request context
 * Priority:
 * 1. Self-hosted mode: Use DEFAULT_WEDDING_ID from env
 * 2. Header (set by middleware)
 * 3. Cookie (set by middleware)
 * 4. Query parameter (for testing/debugging)
 * 5. Domain-based resolution (custom domain or subdomain)
 */
export async function getWeddingId(): Promise<string | null> {
  // Self-hosted mode: use default wedding ID
  if (DEPLOYMENT_MODE === 'self-hosted' && DEFAULT_WEDDING_ID) {
    return DEFAULT_WEDDING_ID
  }

  // Try to get from headers (set by middleware)
  const headersList = await headers()
  const headerWeddingId = headersList.get('x-wedding-id')
  if (headerWeddingId) {
    return headerWeddingId
  }

  // Try to get from cookies
  const cookieStore = await cookies()
  const cookieWeddingId = cookieStore.get('wedding_id')?.value
  if (cookieWeddingId) {
    return cookieWeddingId
  }

  // Try domain-based resolution (for SaaS mode)
  if (DEPLOYMENT_MODE === 'saas') {
    const domain = headersList.get('host') || ''
    const weddingId = await resolveWeddingFromDomain(domain)
    if (weddingId) {
      return weddingId
    }
  }

  return null
}

/**
 * Resolve wedding from domain (custom domain or subdomain)
 */
async function resolveWeddingFromDomain(host: string): Promise<string | null> {
  try {
    const supabase = supabaseService()

    // Remove port from host (e.g., "localhost:3000" -> "localhost")
    const hostname = host.split(':')[0]

    // Check for custom domain match
    const { data: customDomainMatch, error: customError } = await supabase
      .from('wedding_domains')
      .select('wedding_id')
      .eq('domain', hostname)
      .eq('is_verified', true)
      .single()

    if (!customError && customDomainMatch?.wedding_id) {
      return customDomainMatch.wedding_id
    }

    // Check for subdomain match (e.g., "couple.weddingplatform.com")
    const subdomain = extractSubdomain(hostname)
    if (subdomain) {
      const { data: subdomainMatch, error: subdomainError } = await supabase
        .from('weddings')
        .select('id')
        .eq('subdomain', subdomain)
        .eq('status', 'active')
        .single()

      if (!subdomainError && subdomainMatch?.id) {
        return subdomainMatch.id
      }
    }

    // Check for slug in path (if using path-based routing)
    // This will be handled by middleware for path-based routes
  } catch (error) {
    console.error('Error resolving wedding from domain:', error)
  }

  return null
}

/**
 * Extract subdomain from hostname
 * e.g., "couple.weddingplatform.com" -> "couple"
 */
function extractSubdomain(hostname: string): string | null {
  const parts = hostname.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }
  return null
}

/**
 * Get full wedding context including wedding data
 */
export async function getWeddingContext(): Promise<WeddingContext | null> {
  const weddingId = await getWeddingId()
  if (!weddingId) {
    return null
  }

  try {
    const supabase = supabaseService()
    const { data: wedding, error } = await supabase
      .from('weddings')
      .select('id, slug, bride_name, groom_name, couple_display_name, hashtag, primary_date, venue_name, city, country, contact_email, custom_domain, subdomain, enable_gallery, enable_registry, enable_travel, enable_wedding_party, enable_faq, registry_url, travel_url, gallery_url')
      .eq('id', weddingId)
      .eq('status', 'active')
      .single()

    if (error || !wedding) {
      console.error('Error fetching wedding:', error)
      return null
    }

    return {
      weddingId: wedding.id,
      wedding: {
        id: wedding.id,
        slug: wedding.slug,
        bride_name: wedding.bride_name,
        groom_name: wedding.groom_name,
        couple_display_name: wedding.couple_display_name,
        hashtag: wedding.hashtag,
        primary_date: wedding.primary_date,
        venue_name: wedding.venue_name,
        city: wedding.city,
        country: wedding.country,
        contact_email: wedding.contact_email,
        custom_domain: wedding.custom_domain,
        subdomain: wedding.subdomain,
        enable_gallery: wedding.enable_gallery,
        enable_registry: wedding.enable_registry,
        enable_travel: wedding.enable_travel,
        enable_wedding_party: wedding.enable_wedding_party,
        enable_faq: wedding.enable_faq,
        registry_url: wedding.registry_url,
        travel_url: wedding.travel_url,
        gallery_url: wedding.gallery_url,
      },
    }
  } catch (error) {
    console.error('Error in getWeddingContext:', error)
    return null
  }
}

/**
 * Client-side helper to get wedding ID from URL/search params
 * Used in client components where headers aren't available
 */
export function getWeddingIdFromClient(): string | null {
  // Self-hosted mode
  if (typeof window !== 'undefined' && DEPLOYMENT_MODE === 'self-hosted' && DEFAULT_WEDDING_ID) {
    return DEFAULT_WEDDING_ID
  }

  // Try URL search params (for testing/debugging)
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search)
    const weddingId = params.get('wedding_id')
    if (weddingId) {
      return weddingId
    }

    // Try to extract from domain
    const hostname = window.location.hostname
    // This would need an API call to resolve, so we'll use cookies instead
    // Cookies are set by middleware after domain resolution
  }

  return null
}

