import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const config = { matcher: ['/admin/:path*'] }

export async function middleware(req: Request) {
  const url = new URL(req.url)
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
