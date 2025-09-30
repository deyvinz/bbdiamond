'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { MotionStagger, MotionItem, MotionCard } from '@/components/ui/motion'
import { 
  Users, 
  MapPin, 
  Calendar, 
  Clock,
  UtensilsCrossed,
  User
} from 'lucide-react'

interface GuestSeatingInfoProps {
  inviteCode: string
  guestName?: string
}

interface Seat {
  id: string
  seat_number: number
  table: {
    id: string
    name: string
    capacity: number
  }
  event: {
    id: string
    name: string
    starts_at: string
    venue: string
    address?: string
  }
}

export default function GuestSeatingInfo({ inviteCode, guestName }: GuestSeatingInfoProps) {
  const [seatingInfo, setSeatingInfo] = useState<{
    guest: {
      id: string
      first_name: string
      last_name: string
      email: string
    }
    seats: Seat[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSeatingInfo = async () => {
      if (!inviteCode) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/seating/guest-seating', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ invite_code: inviteCode }),
        })
        
        const data = await response.json()
        
        if (data.success) {
          setSeatingInfo(data)
        } else {
          setError(data.message || 'Failed to fetch seating information')
        }
      } catch (error) {
        console.error('Error fetching seating info:', error)
        setError('Failed to load seating information')
      } finally {
        setLoading(false)
      }
    }

    fetchSeatingInfo()
  }, [inviteCode])

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <Users className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Seating Not Available</h3>
        <p className="text-gray-600 text-sm">
          {error}
        </p>
      </div>
    )
  }

  if (!seatingInfo || seatingInfo.seats.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
          <Users className="h-8 w-8 text-gold-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Seating Assignment Pending</h3>
        <p className="text-gray-600 text-sm">
          Your seating assignment will be available closer to the event date.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-serif text-gray-900 mb-2">Your Seating Assignment</h3>
        <p className="text-gray-600 text-sm">
          Welcome {guestName || `${seatingInfo.guest.first_name} ${seatingInfo.guest.last_name}`}! 
          Here's where you'll be seated for our special day.
        </p>
      </div>

      <MotionStagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {seatingInfo.seats.map((seat, idx) => (
          <MotionItem key={seat.id}>
            <MotionCard>
              <Card className="p-6">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-100">
                      <User className="h-5 w-5 text-gold-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium text-lg">{seat.table.name}</h4>
                      <Badge variant="outline" className="bg-gold-50 text-gold-700 border-gold-200">
                        Seat {seat.seat_number}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <UtensilsCrossed className="h-4 w-4 text-gold-500" />
                        <span>Table capacity: {seat.table.capacity} guests</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gold-500" />
                        <span className="font-medium">{seat.event.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-gold-500" />
                        <span>
                          {new Date(seat.event.starts_at).toLocaleDateString([], { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gold-500" />
                        <span>{seat.event.venue}</span>
                      </div>
                      
                      {seat.event.address && (
                        <div className="text-xs text-gray-500 ml-6">
                          {seat.event.address}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </MotionCard>
          </MotionItem>
        ))}
      </MotionStagger>

      <div className="mt-6 rounded-lg bg-gold-50/60 border border-gold-200 px-4 py-3">
        <p className="text-sm text-gold-900 font-medium">
          💡 <strong>Pro tip:</strong> Save this information or take a screenshot for easy reference on the wedding day!
        </p>
      </div>
    </div>
  )
}
