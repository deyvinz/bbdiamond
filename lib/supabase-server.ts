import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

export async function supabaseServer() {
  const cookieStore = await cookies()
  
  // Debug: Log Supabase cookies only
  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.startsWith('sb-') || cookie.name.includes('supabase')
  )
  console.log('Supabase cookies found:', supabaseCookies.length)
  
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
