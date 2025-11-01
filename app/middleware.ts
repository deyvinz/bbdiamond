import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const DEPLOYMENT_MODE = process.env.DEPLOYMENT_MODE || 'saas'
const DEFAULT_WEDDING_ID = process.env.DEFAULT_WEDDING_ID

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

  // Skip middleware for static files, storefront, and admin routes that don't need wedding context
  if (
    url.pathname.startsWith('/_next') ||
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

  // Self-hosted mode: use default wedding ID
  if (DEPLOYMENT_MODE === 'self-hosted' && DEFAULT_WEDDING_ID) {
    weddingId = DEFAULT_WEDDING_ID
  } else if (DEPLOYMENT_MODE === 'saas') {
    // SaaS mode: resolve from domain
    const hostname = url.hostname
    weddingId = await resolveWeddingFromDomain(hostname, url.pathname)
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

    // Check for custom domain match
    const { data: customDomain } = await supabase
      .from('wedding_domains')
      .select('wedding_id')
      .eq('domain', domain)
      .eq('is_verified', true)
      .single()

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
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string | null {
  // Don't extract subdomain for localhost or IP addresses
  if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return null
  }

  const parts = hostname.split('.')
  // If we have 3+ parts, the first is the subdomain
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}
