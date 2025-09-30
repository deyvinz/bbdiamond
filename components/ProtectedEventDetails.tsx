'use client'

import { useState, useEffect } from 'react'
import Section from '@/components/Section'
import Card from '@/components/Card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion'
import { 
  Heart, 
  Church, 
  UtensilsCrossed, 
  Calendar, 
  MapPin, 
  Lock,
  Users
} from 'lucide-react'

interface Event {
  name: string
  venue: string
  address: string
  starts_at: string
}

interface Guest {
  id: string
  first_name: string
  last_name: string
  email: string
  invite_code: string
  invitation_token: string
}

interface ProtectedEventDetailsProps {
  onAccessGranted: (guest: Guest) => void
}

export default function ProtectedEventDetails({ onAccessGranted }: ProtectedEventDetailsProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guest, setGuest] = useState<Guest | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const { toast } = useToast()

  // Check for existing authentication on mount
  useEffect(() => {
    const savedGuest = sessionStorage.getItem('schedule-guest')
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest)
        setGuest(guestData)
        setIsAuthenticated(true)
        // fetchGuestEvents will be called in the next useEffect when guest is set
      } catch (error) {
        console.error('Error parsing saved guest data:', error)
        sessionStorage.removeItem('schedule-guest')
      }
    }
  }, [])

  // Separate useEffect to fetch events when guest is available
  useEffect(() => {
    if (guest?.invite_code && isAuthenticated) {
      fetchGuestEvents()
    }
  }, [guest, isAuthenticated])

  const fetchGuestEvents = async () => {
    if (!guest?.invite_code) {
      console.log('No guest or invite code available, skipping event fetch')
      return
    }

    try {
      const response = await fetch('/api/schedule/guest-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invite_code: guest.invite_code }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setEvents(data.events)
      } else {
        console.error('Failed to fetch guest events:', data.message)
      }
    } catch (error) {
      console.error('Error fetching guest events:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!inviteCode.trim()) {
      toast({
        title: "Invite Code Required",
        description: "Please enter your invite code to view event details.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/schedule/validate-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        const guestData = data.guest
        setGuest(guestData)
        setIsAuthenticated(true)
        sessionStorage.setItem('schedule-guest', JSON.stringify(guestData))
        // fetchGuestEvents will be called by the useEffect when guest is set
        
        toast({
          title: "Access Granted! 🎉",
          description: `Welcome, ${guestData.first_name}! You can now view the event details.`,
        })
        
        onAccessGranted(guestData)
      } else {
        toast({
          title: "Invalid Invite Code",
          description: data.message || "Please check your invite code and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error validating invite code:', error)
      toast({
        title: "Error",
        description: "Failed to validate invite code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getEventIcon = (eventName: string) => {
    const name = eventName.toLowerCase()
    
    if (name.includes('ceremony') || name.includes('church')) {
      return <Church className="h-6 w-6 text-gold-600" />
    }
    if (name.includes('reception') || name.includes('dinner') || name.includes('lunch') || name.includes('breakfast')) {
      return <UtensilsCrossed className="h-6 w-6 text-gold-600" />
    }
    if (name.includes('traditional') || name.includes('cultural')) {
      return <Heart className="h-6 w-6 text-gold-600" />
    }
    
    // Default icon
    return <Calendar className="h-6 w-6 text-gold-600" />
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <Section title="Event Details" subtitle="Enter your invite code to view details">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
                <Lock className="h-8 w-8 text-gold-600" />
              </div>
              <h3 className="text-xl font-serif mb-2">Protected Event Details</h3>
              <p className="text-gray-600">
                Enter your invite code to view detailed event information.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="invite-code" className="text-sm font-medium text-gray-700">
                  Invite Code
                </label>
                <input
                  id="invite-code"
                  type="text"
                  placeholder="Enter your invite code"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-center text-lg tracking-wider focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  disabled={isLoading}
                  autoComplete="off"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-gold-600 text-white hover:bg-gold-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    View Event Details
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-500 mt-0.5" />
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-1">Don't have an invite code?</p>
                  <p>Your invite code was included in your wedding invitation. If you can't find it, please contact the couple directly.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Section>
    )
  }

  // Show protected event details
  return (
    <Section title="Event Details" subtitle="Everything you need for the big day">
      <div className="mb-4 p-3 bg-gold-50 rounded-lg border border-gold-200">
        <p className="text-sm text-gold-800">
          <span className="font-medium">Welcome, {guest?.first_name}!</span> Here are the detailed event information for our special day.
        </p>
      </div>
      
      {events.length > 0 ? (
        <MotionStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {events.map((event, idx) => (
            <MotionItem key={idx}>
              <MotionCard>
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getEventIcon(event.name)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-lg">{event.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-gold-500" />
                        <p className="text-sm text-black/70">
                          {new Date(event.starts_at).toLocaleDateString([], { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-gold-500" />
                        <p className="text-sm text-black/70">{event.venue}</p>
                      </div>
                      {event.address && (
                        <p className="text-sm text-black/70 mt-1">{event.address}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Calendar className="h-4 w-4 text-gold-500" />
                        <p className="text-sm text-gold-600 font-medium">
                          {new Date(event.starts_at).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            hour12: true 
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </MotionCard>
            </MotionItem>
          ))}
        </MotionStagger>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gold-100">
            <Calendar className="h-10 w-10 text-gold-600" />
          </div>
          <h3 className="text-xl font-serif text-gray-900 mb-2">No Events Assigned</h3>
          <p className="text-gray-600 mb-4">
            Hi {guest?.first_name}, it looks like you don't have any specific events assigned to your invitation yet.
          </p>
          <p className="text-sm text-gray-500">
            Please contact the couple directly if you believe this is an error, or check back later for updates.
          </p>
        </div>
      )}

      <div className="mt-6 rounded-lg bg-gold-50/60 border border-gold-200 px-4 py-3">
        <p className="text-sm text-gold-900 font-medium">
          Kindly note:{' '}
          <span className="font-semibold">White and ivory outfits are not permitted</span> for
          guests. Please choose other colors to let the couple stand out on their special day.
        </p>
      </div>
    </Section>
  )
}
