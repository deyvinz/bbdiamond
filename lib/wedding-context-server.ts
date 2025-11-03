import { headers } from 'next/headers'
import { cookies } from 'next/headers'
import { supabaseService } from './supabase-service'
import type { WeddingContext } from './wedding-context'

const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'saas'
const DEFAULT_WEDDING_ID = process.env.DEFAULT_WEDDING_ID // For self-hosted mode

/**
 * Resolve wedding ID from request context (SERVER ONLY)
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
 * Supports:
 * - Production: "couple.weddingplatform.com" -> "couple"
 * - Localhost: "couple.localhost" -> "couple"
 * - lvh.me: "couple.lvh.me" -> "couple" (better cross-browser support)
 * - Hosts file: "couple.weddingplatform.com" (mapped to 127.0.0.1) -> "couple"
 */
function extractSubdomain(hostname: string): string | null {
  const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
  const ENABLE_LOCALHOST_TESTING = process.env.ENABLE_LOCALHOST_TESTING !== 'false'
  
  // Remove port if present
  const domain = hostname.split(':')[0]

  // Check for localhost patterns (development only)
  if (IS_DEVELOPMENT || ENABLE_LOCALHOST_TESTING) {
    // Support subdomain.localhost pattern (e.g., "john-sarah.localhost:3000")
    if (domain.endsWith('.localhost')) {
      const parts = domain.split('.')
      if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
        return parts[0]
      }
    }

    // Support subdomain.lvh.me pattern (lvh.me resolves to 127.0.0.1)
    // Better cross-browser support than .localhost
    if (domain.endsWith('.lvh.me')) {
      const parts = domain.split('.')
      if (parts.length >= 3 && parts[parts.length - 2] === 'lvh' && parts[parts.length - 1] === 'me') {
        return parts[0]
      }
    }

    // For hosts file mappings, we can still extract subdomain normally
    // if it's a valid domain pattern (3+ parts)
    // This allows testing with "couple.weddingplatform.com" mapped to 127.0.0.1
    const parts = domain.split('.')
    if (parts.length >= 3 && domain !== 'localhost') {
      return parts[0]
    }
  }

  // Production: Don't extract subdomain for bare localhost or IP addresses
  if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return null
  }

  // Production: Extract subdomain for standard domain patterns
  const parts = domain.split('.')
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * Get full wedding context including wedding data (SERVER ONLY)
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

