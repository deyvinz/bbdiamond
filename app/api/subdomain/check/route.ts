import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Check if a subdomain is available
 * GET /api/subdomain/check?subdomain=example
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const subdomain = searchParams.get('subdomain')

    if (!subdomain) {
      return NextResponse.json(
        { available: false, error: 'Subdomain parameter is required' },
        { status: 400 }
      )
    }

    // Validate subdomain format
    // Subdomain should be lowercase alphanumeric with hyphens
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/
    if (!subdomainRegex.test(subdomain.toLowerCase())) {
      return NextResponse.json(
        {
          available: false,
          error: 'Invalid subdomain format. Use only lowercase letters, numbers, and hyphens.',
        },
        { status: 400 }
      )
    }

    // Check reserved subdomains
    const reservedSubdomains = [
      'www',
      'api',
      'admin',
      'dashboard',
      'app',
      'mail',
      'email',
      'blog',
      'store',
      'help',
      'support',
      'about',
      'contact',
      'privacy',
      'terms',
      'auth',
      'login',
      'signup',
      'register',
      'onboarding',
      'test',
      'staging',
      'dev',
      'development',
      'prod',
      'production',
    ]

    if (reservedSubdomains.includes(subdomain.toLowerCase())) {
      return NextResponse.json(
        {
          available: false,
          error: 'This subdomain is reserved and cannot be used.',
        },
        { status: 400 }
      )
    }

    // Check database for existing subdomain
    const supabase = await supabaseServer()
    const { data: existing, error } = await supabase
      .from('weddings')
      .select('id, subdomain')
      .eq('subdomain', subdomain.toLowerCase())
      .maybeSingle()

    if (error) {
      console.error('Error checking subdomain:', error)
      return NextResponse.json(
        { available: false, error: 'Error checking subdomain availability' },
        { status: 500 }
      )
    }

    const available = !existing

    return NextResponse.json({
      available,
      subdomain: subdomain.toLowerCase(),
      message: available
        ? 'Subdomain is available'
        : 'Subdomain is already taken',
    })
  } catch (error) {
    console.error('Error in subdomain check:', error)
    return NextResponse.json(
      {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

