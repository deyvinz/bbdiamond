import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { logger } from './logger'

export async function supabaseServer() {
  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables not found. This is expected during build time.')
    // Return a mock client for build time
    return {
      from: () => ({
        select: () => ({
          order: () => Promise.resolve({ data: [], error: null })
        })
      }),
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: null })
      }
    } as any
  }

  const cookieStore = await cookies()
  
  // Debug: Log Supabase cookies only
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.startsWith('sb-') || cookie.name.includes('supabase')
  )
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) { 
          const value = cookieStore.get(name)?.value
          return value
        },
        set(name: string, value: string, options: CookieOptions) {
          try { 
            cookieStore.set({ name, value, ...options }) 
          } catch (error: any) {
            // In Next.js 15, cookies can only be modified in Server Actions or Route Handlers
            // Silently ignore cookie set errors in Server Components (read-only context)
            if (error?.message?.includes('Cookies can only be modified')) {
              // This is expected in Server Components - Supabase will handle session via other means
              return
            }
            logger.error(`Error setting cookie ${name}:`, error) 
          }
        },
        remove(name: string, options: CookieOptions) {
          try { 
            cookieStore.set({ name, value: '', ...options }) 
          } catch (error: any) {
            // In Next.js 15, cookies can only be modified in Server Actions or Route Handlers
            // Silently ignore cookie remove errors in Server Components (read-only context)
            if (error?.message?.includes('Cookies can only be modified')) {
              // This is expected in Server Components - Supabase will handle session via other means
              return
            }
            logger.error(`Error removing cookie ${name}:`, error)
          }
        },
      },
    }
  )
}
