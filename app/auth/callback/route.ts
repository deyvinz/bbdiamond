import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseService } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const nextUrl = requestUrl.searchParams.get('next') || '/dashboard'
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      new URL(`/auth/sign-in?error=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    )
  }

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Exchange code for session
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError)
      return NextResponse.redirect(
        new URL(`/auth/sign-in?error=callback_error`, requestUrl.origin)
      )
    }

    if (data?.user) {
      // Check if customer record exists, create if not
      const supabaseServiceClient = supabaseService()
      const { data: customer, error: customerError } = await supabaseServiceClient
        .from('customers')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (customerError && customerError.code === 'PGRST116') {
        // Customer doesn't exist, create one
        // Get plan from user metadata (set during signup) or default to basic
        const plan = data.user.user_metadata?.plan || 'basic'
        
        // Get plan ID
        const { data: planData } = await supabaseServiceClient
          .from('subscription_plans')
          .select('id')
          .eq('name', plan === 'basic' ? 'Basic' : plan === 'premium' ? 'Premium' : 'Enterprise')
          .single()

        const { error: createError } = await supabaseServiceClient
          .from('customers')
          .insert({
            id: data.user.id,
            email: data.user.email || '',
            full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
            subscription_status: 'trial',
            current_plan_id: planData?.id || null,
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
          })

        if (createError) {
          console.error('Error creating customer record:', createError)
          // Continue anyway, customer can be created later
        }
      }

      // Redirect to the next URL or dashboard
      return NextResponse.redirect(new URL(nextUrl, requestUrl.origin))
    }
  }

  // If no code, redirect to sign-in
  return NextResponse.redirect(
    new URL('/auth/sign-in?error=no_code', requestUrl.origin)
  )
}

