'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

function CheckinRedirectContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const token = searchParams.get('token')
    
    if (token) {
      // Redirect to the correct admin checkin page with the token
      router.replace(`/admin/checkin?token=${token}`)
    } else {
      // If no token, redirect to admin checkin page
      router.replace('/admin/checkin')
    }
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-4"></div>
        <p className="text-gold-600">Redirecting to check-in page...</p>
      </div>
    </div>
  )
}

export default function CheckinRedirect() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-4"></div>
          <p className="text-gold-600">Loading...</p>
        </div>
      </div>
    }>
      <CheckinRedirectContent />
    </Suspense>
  )
}
