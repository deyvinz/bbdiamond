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
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          router.push('/auth/sign-in?next=/admin')
          return
        }
        
        if (!user) {
          router.push('/auth/sign-in?next=/admin')
          return
        }
        
        setUser(user)
        setLoading(false)
      } catch (err) {
        router.push('/auth/sign-in?next=/admin')
      }
    }

    checkAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      
      if (event === 'SIGNED_OUT' || !session) {
        router.push('/auth/sign-in?next=/admin')
      } else if (event === 'SIGNED_IN' && session.user) {
        setUser(session.user)
        setLoading(false)
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

  if (!user) {
    return null // Will redirect
  }

  return <>{children}</>
}
