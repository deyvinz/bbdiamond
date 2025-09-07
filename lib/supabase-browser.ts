import { createBrowserClient } from '@supabase/ssr'

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.split('; ').find((row) => row.startsWith(name + '='))
  return match ? decodeURIComponent(match.split('=')[1]) : undefined
}

function setCookie(name: string, value: string, options?: { maxAge?: number; path?: string }) {
  if (typeof document === 'undefined') return
  const maxAge = options?.maxAge ?? 60 * 60 * 24 * 365 // 1 year
  const path = options?.path ?? '/'
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; SameSite=Lax` 
}

function removeCookie(name: string, options?: { path?: string }) {
  if (typeof document === 'undefined') return
  const path = options?.path ?? '/'
  document.cookie = `${name}=; Max-Age=0; Path=${path}; SameSite=Lax`
}

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase environment variables not found. This is expected during build time.')
}

export const supabase = createBrowserClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    cookies: {
      get: getCookie,
      set: setCookie,
      remove: removeCookie,
    },
  }
)
