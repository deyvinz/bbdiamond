'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useToast } from '@/components/ui/use-toast'
import type { ConfigValue } from '@/lib/types/config'

// Dynamically import components to reduce initial bundle size and compilation time
const ScheduleAccessForm = dynamic(() => import('@/components/ScheduleAccessForm'), {
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false
})

const ProtectedSchedule = dynamic(() => import('@/components/ProtectedSchedule'), {
  loading: () => (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
    </div>
  ),
  ssr: false
})

export default function Page() {
  const [guest, setGuest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [config, setConfig] = useState<ConfigValue | null>(null)
  const { toast } = useToast()

  // Load config and guest data from session storage on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/config')
        if (response.ok) {
          const configData = await response.json()
          setConfig(configData)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      }
    }

    loadConfig()

    const savedGuest = sessionStorage.getItem('schedule-guest')
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest)
        setGuest(guestData)
        // Show welcome back message
        toast({
          title: "Welcome back! 👋",
          description: `You're automatically logged in, ${guestData.first_name}.`,
        })
      } catch (error) {
        console.error('Error parsing saved guest data:', error)
        // Clear invalid data
        sessionStorage.removeItem('schedule-guest')
      }
    }
    setIsLoading(false)
  }, [toast])

  const handleAccessGranted = (guestData: any) => {
    // Save guest data to session storage
    sessionStorage.setItem('schedule-guest', JSON.stringify(guestData))
    setGuest(guestData)
  }

  const handleLogout = () => {
    // Clear guest data from session storage
    sessionStorage.removeItem('schedule-guest')
    setGuest(null)
  }

  // Show loading state while checking session storage
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (guest) {
    return <ProtectedSchedule guest={guest} onLogout={handleLogout} />
  }

  // Check if access code is required
  const accessCodeRequired = config?.access_code_enabled && config?.access_code_required_schedule

  // Show schedule directly if access code not required
  if (!accessCodeRequired && config) {
    return <ProtectedSchedule guest={null} onLogout={handleLogout} />
  }

  // Show access form if required or config not loaded yet
  if (accessCodeRequired || !config) {
    return <ScheduleAccessForm onAccessGranted={handleAccessGranted} />
  }

  return null
}
