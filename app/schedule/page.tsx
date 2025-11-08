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
      } finally {
        // Only set loading to false after config is loaded
        setIsLoading(false)
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

  // Show loading state while config is being loaded
  // This prevents the access form from flashing before we know if it's needed
  if (isLoading || !config) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
          <p className="text-sm text-gray-600">Loading schedule...</p>
        </div>
      </div>
    )
  }

  // If guest is already authenticated, show schedule immediately
  if (guest) {
    return <ProtectedSchedule guest={guest} onLogout={handleLogout} />
  }

  // Check if access code is required (only after config is loaded)
  const accessCodeRequired = config.access_code_enabled && config.access_code_required_schedule

  // Show schedule directly if access code not required
  if (!accessCodeRequired) {
    return <ProtectedSchedule guest={null} onLogout={handleLogout} />
  }

  // Show access form only if access code is required
  return <ScheduleAccessForm onAccessGranted={handleAccessGranted} />
}
