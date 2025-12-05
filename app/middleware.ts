import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { normalizeDomain, isMainDomain } from '@/lib/utils'

const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'saas'
const DEFAULT_WEDDING_ID = process.env.DEFAULT_WEDDING_ID
const ENABLE_LOCALHOST_TESTING = process.env.ENABLE_LOCALHOST_TESTING !== 'false' // Default to true
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

export async function middleware(req: Request) {
  const url = new URL(req.url)
  const res = NextResponse.next()

  // Always set pathname header for layout to use
  res.headers.set('x-pathname', url.pathname)

  // Store route protection: Only allow access from main domain (luwani.com) or localhost in dev
  const hostname = url.hostname
  const isStoreRoute = url.pathname.startsWith('/store') || 
                       url.pathname.startsWith('/dashboard') || 
                       url.pathname.startsWith('/onboarding')
  
  if (isStoreRoute) {
    // In development, allow localhost
    const isLocalhost = hostname === 'localhost' || 
                       hostname.startsWith('127.0.0.1') || 
                       hostname.startsWith('192.168.') ||
                       hostname.startsWith('10.0.')
    
    // Check if domain is main domain (luwani.com with or without www)
    if (!isLocalhost && !isMainDomain(hostname)) {
      // Redirect to main domain with same path
      const mainDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com'
      const redirectUrl = new URL(url.pathname + url.search, mainDomain)
      return NextResponse.redirect(redirectUrl)
    }
  }

  // Skip middleware for static files, Next.js internals, storefront, and admin routes
  // Also skip RSC (React Server Component) prefetch requests to prevent blocking
  if (
    url.pathname.startsWith('/_next') ||
    url.searchParams.has('__rsc') || // RSC prefetch requests
    url.pathname.startsWith('/api/health') ||
    url.pathname.startsWith('/store') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/onboarding') ||
    url.pathname.startsWith('/auth') ||
    url.pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/i)
  ) {
    return res
  }

  // Resolve wedding ID
  let weddingId: string | null = null

  // Development/testing: Check query parameters first (dev only)
  if ((IS_DEVELOPMENT || ENABLE_LOCALHOST_TESTING) && DEPLOYMENT_MODE === 'saas') {
    const weddingIdParam = url.searchParams.get('weddingId')
    const subdomainParam = url.searchParams.get('subdomain')
    
    if (weddingIdParam) {
      weddingId = weddingIdParam
    } else if (subdomainParam) {
      // Lookup wedding by subdomain
      weddingId = await lookupWeddingBySubdomain(subdomainParam)
    }
  }

  // Self-hosted mode: use default wedding ID
  if (!weddingId && DEPLOYMENT_MODE === 'self-hosted' && DEFAULT_WEDDING_ID) {
    weddingId = DEFAULT_WEDDING_ID
  } else if (!weddingId && DEPLOYMENT_MODE === 'saas') {
    // SaaS mode: resolve from domain
    // Wrap in try-catch with timeout protection to prevent blocking RSC prefetch requests
    try {
      const hostname = url.hostname
      // Use Promise.race with timeout to prevent hanging on slow DB lookups
      const lookupPromise = resolveWeddingFromDomain(hostname, url.pathname)
      const timeoutPromise = new Promise<string | null>((resolve) => {
        setTimeout(() => resolve(null), 2000) // 2 second timeout
      })
      weddingId = await Promise.race([lookupPromise, timeoutPromise])
    } catch (error) {
      console.error('Error resolving wedding ID in middleware:', error)
      // Continue without wedding ID rather than blocking the request
    }
  }

  // Set wedding ID in headers for downstream use
  if (weddingId) {
    res.headers.set('x-wedding-id', weddingId)
    
    // Also set in cookie for client-side access
    res.cookies.set('wedding_id', weddingId, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })
  }

  // Admin route protection
  if (url.pathname.startsWith('/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase environment variables not found in middleware. Skipping auth check.')
      return res
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return (res as any).cookies.get(name)?.value
        },
        set(name, value, options) {
          ;(res as any).cookies.set(name, value, options)
        },
        remove(name, options) {
          ;(res as any).cookies.set(name, '', { ...options, maxAge: 0 })
        },
      },
    })

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      url.pathname = '/auth/sign-in'
      url.searchParams.set('next', url.pathname)
      return NextResponse.redirect(url)
    }

    // Verify wedding ownership for admin routes
    // Get wedding ID from context (already set earlier in middleware)
    const weddingIdFromHeader = res.headers.get('x-wedding-id')
    if (weddingIdFromHeader) {
      // Check if user owns this wedding
      const { data: ownership, error: ownershipError } = await supabase
        .from('wedding_owners')
        .select('wedding_id')
        .eq('wedding_id', weddingIdFromHeader)
        .eq('customer_id', user.id)
        .single()

      if (ownershipError || !ownership) {
        // User doesn't own this wedding, redirect to sign-in with error
        url.pathname = '/auth/sign-in'
        url.searchParams.set('error', 'access_denied')
        url.searchParams.set('next', url.pathname)
        return NextResponse.redirect(url)
      }
    }
  }

  return res
}

/**
 * Resolve wedding ID from domain or path
 */
async function resolveWeddingFromDomain(
  hostname: string,
  pathname: string
): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    // Remove port if present
    const domain = hostname.split(':')[0]
    const normalizedDomain = normalizeDomain(domain)

    // Check for custom domain match (both exact match and normalized version)
    // This handles both 'boandjane.com' and 'www.boandjane.com' matching the same wedding
    let query = supabase
      .from('wedding_domains')
      .select('wedding_id')
      .eq('is_verified', true)
    
    // Use OR condition if domain differs from normalized (i.e., has www prefix)
    if (domain !== normalizedDomain) {
      query = query.or(`domain.eq.${domain},domain.eq.${normalizedDomain}`)
    } else {
      query = query.eq('domain', domain)
    }
    
    const { data: customDomain } = await query.maybeSingle()

    if (customDomain?.wedding_id) {
      return customDomain.wedding_id
    }

    // Check for subdomain match (e.g., "couple.weddingplatform.com")
    const subdomain = extractSubdomain(domain)
    if (subdomain) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('id')
        .eq('subdomain', subdomain)
        .single()

      if (wedding?.id) {
        return wedding.id
      }
    }

    // Check for path-based routing (e.g., "/w/couple-slug")
    const pathMatch = pathname.match(/^\/w\/([^/]+)/)
    if (pathMatch) {
      const slug = pathMatch[1]
      const { data: wedding } = await supabase
        .from('weddings')
        .select('id')
        .eq('slug', slug)
        .single()

      if (wedding?.id) {
        return wedding.id
      }
    }

    return null
  } catch (error) {
    console.error('Error resolving wedding from domain:', error)
    return null
  }
}

/**
 * Lookup wedding by subdomain (helper for query param support)
 */
async function lookupWeddingBySubdomain(subdomain: string): Promise<string | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      return null
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get() {
          return undefined
        },
        set() {},
        remove() {},
      },
    })

    const { data: wedding } = await supabase
      .from('weddings')
      .select('id')
      .eq('subdomain', subdomain.toLowerCase())
      .single()

    return wedding?.id || null
  } catch (error) {
    console.error('Error looking up wedding by subdomain:', error)
    return null
  }
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
  // If we have 3+ parts, the first is the subdomain
  // e.g., "couple.weddingplatform.com" -> ["couple", "weddingplatform", "com"]
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}
