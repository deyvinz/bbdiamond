import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function supabaseServer() {
  // Check if environment variables are available
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  console.log('Supabase URL:', supabaseUrl ? 'Set' : 'Not set')
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Set' : 'Not set')
  
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
  console.log('Supabase cookies found:', supabaseCookies.length)
  
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
          } catch (error) {
            console.log(`Error setting cookie ${name}:`, error)
          }
        },
        remove(name: string, options: CookieOptions) {
          try { 
            cookieStore.set({ name, value: '', ...options }) 
          } catch (error) {
            console.log(`Error removing cookie ${name}:`, error)
          }
        },
      },
    }
  )
}
