'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase-browser'

interface AdminWrapperProps {
  children: React.ReactNode
}

export default function AdminWrapper({ children }: AdminWrapperProps) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [accessDenied, setAccessDenied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const checkAuthAndAccess = async () => {
      try {
        // Check authentication
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error || !user) {
          router.push('/auth/sign-in?next=/admin')
          return
        }

        // Get wedding ID from cookie or API
        let weddingId: string | null = null
        try {
          const response = await fetch('/api/wedding-info')
          const data = await response.json()
          if (data.success && data.wedding?.id) {
            weddingId = data.wedding.id
          }
        } catch (err) {
          console.error('Error fetching wedding info:', err)
        }

        // If we have a wedding ID, verify ownership
        if (weddingId) {
          const accessResponse = await fetch('/api/auth/wedding-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ weddingId }),
          })

          const accessData = await accessResponse.json()
          if (!accessData.hasAccess) {
            setAccessDenied(true)
            setLoading(false)
            return
          }
        }

        setUser(user)
        setLoading(false)
      } catch (err) {
        console.error('Error checking auth:', err)
        router.push('/auth/sign-in?next=/admin&error=callback_error')
      }
    }

    checkAuthAndAccess()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/auth/sign-in?next=/admin')
      } else if (event === 'SIGNED_IN' && session.user) {
        // Re-check access when user signs in
        checkAuthAndAccess()
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
        <div className="bg-white/80 backdrop-blur border border-gold-100 rounded-2xl p-8 shadow-gold text-center">
          <h1 className="font-serif text-2xl mb-4">Loading Admin Panel</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto"></div>
        </div>
      </div>
    )
  }

  if (accessDenied) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="fixed inset-0 -z-10 bg-subtleGrid bg-[length:16px_16px]" />
        <div className="bg-white/80 backdrop-blur border border-red-200 rounded-2xl p-8 shadow-gold text-center max-w-md">
          <h1 className="font-serif text-2xl mb-4 text-red-700">Access Denied</h1>
          <p className="text-black/70 mb-6">
            You do not have permission to access this wedding's admin panel. Please sign in with the account that owns this wedding.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full px-5 py-3 bg-gold-600 text-white rounded-lg hover:bg-gold-700 transition-colors font-medium"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => router.push('/auth/sign-in?next=/admin')}
              className="w-full px-5 py-3 border border-gold-200 rounded-lg hover:bg-gold-50 transition-colors font-medium"
            >
              Sign In with Different Account
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect
  }

  return <>{children}</>
}
