'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { trackPageView, initializeGA } from '@/lib/analytics'

/**
 * Analytics component that tracks page views
 * Add this to your root layout
 */
export default function Analytics() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Initialize GA on mount
    initializeGA()
  }, [])

  useEffect(() => {
    // Track page views on route change
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : '')
    trackPageView(url)
  }, [pathname, searchParams])

  // Add GA script if measurement ID is configured
  useEffect(() => {
    const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
    if (!measurementId) return

    // Script is loaded in initializeGA, but we ensure it's in the document
    if (typeof window !== 'undefined' && !window.gtag) {
      initializeGA()
    }
  }, [])

  return null
}

