'use client'

import { useState, useEffect } from 'react'
import Section from '@/components/Section'
import { Button, Card, CardBody } from '@heroui/react'
import { MotionPage, MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion'
import { 
  Church, 
  UtensilsCrossed, 
  Camera, 
  Music, 
  Heart, 
  Users, 
  Gift, 
  MapPin, 
  Clock,
  Calendar,
  PartyPopper,
  LogOut
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

interface ProtectedScheduleProps {
  guest: Guest
  onLogout: () => void
}

export default function ProtectedSchedule({ guest, onLogout }: ProtectedScheduleProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGuestEvents = async () => {
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
      } finally {
        setLoading(false)
      }
    }

    if (guest?.invite_code) {
      fetchGuestEvents()
    } else {
      setLoading(false)
    }
  }, [guest])

  const getEventIcon = (eventName: string) => {
    const name = eventName.toLowerCase()
    
    if (name.includes('ceremony') || name.includes('church')) {
      return <Church className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('tradition') || name.includes('party') || name.includes('cultural')) {
      return <PartyPopper className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('reception') || name.includes('dinner') || name.includes('lunch') || name.includes('breakfast')) {
      return <UtensilsCrossed className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('photo') || name.includes('pictures') || name.includes('gallery')) {
      return <Camera className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('music') || name.includes('dance') || name.includes('party')) {
      return <Music className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('bride') || name.includes('groom') || name.includes('couple')) {
      return <Heart className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('bridal') || name.includes('groom') || name.includes('party') || name.includes('attendants')) {
      return <Users className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('gift') || name.includes('registry') || name.includes('shower')) {
      return <Gift className="h-5 w-5 text-gold-600" />
    }
    if (name.includes('rehearsal') || name.includes('practice')) {
      return <Calendar className="h-5 w-5 text-gold-600" />
    }
    
    // Default icon for other events
    return <Clock className="h-5 w-5 text-gold-600" />
  }

  if (loading) {
    return (
      <MotionPage>
        <Section title="Schedule" subtitle="Loading..." narrow>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
          </div>
        </Section>
      </MotionPage>
    )
  }

  return (
    <MotionPage>
      {/* Header with logout */}
      <div className="bg-white border-b border-gray-200">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif text-gold-700">Wedding Schedule</h1>
              <p className="text-gray-600">Welcome, {guest.first_name}!</p>
            </div>
            <Button 
              onClick={onLogout}
              variant="bordered"
              size="sm"
              radius="lg"
              startContent={<LogOut className="h-4 w-4" />}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      <Section title="Event Schedule" subtitle="Times & locations" narrow>
        {events.length > 0 ? (
          <MotionStagger className="relative ml-3 border-s border-gold-100">
            {events.map((event, idx) => (
              <MotionItem key={idx} className="ms-6 mb-6">
                <span className="absolute -start-1.5 mt-4 h-3 w-3 rounded-full bg-gold-500" />
                <MotionCard>
                  <Card className="border border-gray-200 shadow-md rounded-2xl" radius="lg">
                    <CardBody className="p-6">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {getEventIcon(event.name)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-lg text-[#1E1E1E]">{event.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <MapPin className="h-4 w-4 text-[#C8A951]" />
                              <p className="text-sm text-[#1E1E1E]/70">{event.venue} • {event.address}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm bg-[#C8A951]/10 text-[#C8A951] font-medium px-3 py-2 rounded-lg">
                          <Clock className="h-4 w-4" />
                          <time>
                            {new Date(event.starts_at).toLocaleDateString([], { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric', 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              hour12: true 
                            })}
                          </time>
                        </div>
                      </div>
                    </CardBody>
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
              Hi {guest.first_name}, it looks like you don't have any specific events assigned to your invitation yet.
            </p>
            <p className="text-sm text-gray-500">
              Please contact the couple directly if you believe this is an error, or check back later for updates.
            </p>
          </div>
        )}
      </Section>
    </MotionPage>
  )
}
