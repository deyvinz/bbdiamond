'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import ScheduleAccessForm from '@/components/ScheduleAccessForm'
import ProtectedSchedule from '@/components/ProtectedSchedule'

export default function Page() {
  const [guest, setGuest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // Load guest data from session storage on component mount
  useEffect(() => {
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

  return <ScheduleAccessForm onAccessGranted={handleAccessGranted} />
}
