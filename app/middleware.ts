import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = { matcher: ['/admin/:path*'] }

export async function middleware(req: Request) {
  const url = new URL(req.url)
  const res = NextResponse.next()

  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found in middleware. Skipping auth check.')
    return res
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name) { return (res as any).cookies.get(name)?.value },
        set(name, value, options) { (res as any).cookies.set(name, value, options) },
        remove(name, options) { (res as any).cookies.set(name, '', { ...options, maxAge: 0 }) },
      },
    }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    url.pathname = '/auth/sign-in'
    url.searchParams.set('next', '/admin')
    return NextResponse.redirect(url)
  }
  return res
}
