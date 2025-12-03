'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Plus, Trash2, Calendar, MapPin, Clock } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import type { Invitation, InvitationEvent } from '@/lib/invitations-service'
import type { Guest } from '@/lib/types/guests'
import type { ConfigValue } from '@/lib/types/config'

interface InvitationFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invitation?: Invitation
  config?: ConfigValue
  onSave: (data: {
    guest_ids: string[]
    events: Array<{
      event_id: string
      headcount: number
      status: 'pending' | 'accepted' | 'declined' | 'waitlist'
    }>
  }) => void
  loading?: boolean
}

interface EventOption {
  id: string
  name: string
  starts_at: string
  venue: string
  address?: string
}

interface GuestOption {
  id: string
  first_name: string
  last_name: string
  email: string
  is_vip: boolean
  total_guests?: number
}

export default function InvitationForm({
  open,
  onOpenChange,
  invitation,
  config,
  onSave,
  loading = false,
}: InvitationFormProps) {
  const [selectedGuests, setSelectedGuests] = useState<GuestOption[]>([])
  const [selectedEvents, setSelectedEvents] = useState<Array<{
    event_id: string
    headcount: number
    status: 'pending' | 'accepted' | 'declined' | 'waitlist'
  }>>([])
  const [availableGuests, setAvailableGuests] = useState<GuestOption[]>([])
  const [availableEvents, setAvailableEvents] = useState<EventOption[]>([])
  const [searchGuest, setSearchGuest] = useState('')
  const [searchEvent, setSearchEvent] = useState('')

  // Update headcount values when config changes
  useEffect(() => {
    if (config) {
      const newHeadcount = config.plus_ones_enabled ? (config.max_party_size || 1) : 1
      
      setSelectedEvents(prev => prev.map(event => ({
        ...event,
        headcount: config.plus_ones_enabled ? event.headcount : 1
      })))
    }
  }, [config?.plus_ones_enabled, config?.max_party_size])

  // Load available guests and events
  useEffect(() => {
    if (open) {
      loadGuests()
      loadEvents()
    }
  }, [open])

  // Initialize form with existing invitation data
  useEffect(() => {
    if (invitation && availableEvents.length > 0) {
      setSelectedGuests([invitation.guest])
      setSelectedEvents(
        invitation.invitation_events.map(event => ({
          event_id: event.event_id,
          headcount: event.headcount,
          status: event.status,
        }))
      )
    } else if (!invitation) {
      setSelectedGuests([])
      setSelectedEvents([])
    }
  }, [invitation, availableEvents])

  const loadGuests = async () => {
    try {
      const response = await fetch('/api/guests?pageSize=1000')
      if (!response.ok) {
        throw new Error('Failed to fetch guests')
      }
      const data = await response.json()
      const guests: GuestOption[] = data.guests.map((guest: any) => ({
        id: guest.id,
        first_name: guest.first_name,
        last_name: guest.last_name,
        email: guest.email,
        is_vip: guest.is_vip || false,
        total_guests: guest.total_guests || 1
      }))
      setAvailableGuests(guests)
    } catch (error) {
      console.error('Failed to load guests:', error)
      toast({
        title: "Error",
        description: "Failed to load guests. Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events')
      if (!response.ok) {
        throw new Error('Failed to fetch events')
      }
      const data = await response.json()
      
      // Handle new events API response format
      if (data.success && data.events && Array.isArray(data.events)) {
        const eventOptions: EventOption[] = data.events.map((event: any) => ({
          id: event.id,
          name: event.name,
          starts_at: event.starts_at,
          venue: event.venue,
          address: event.address
        }))
        setAvailableEvents(eventOptions)
      } else if (data.error) {
        throw new Error(data.error)
      } else {
        throw new Error('Invalid response format')
      }
    } catch (error) {
      console.error('Failed to load events:', error)
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      })
    }
  }

  const filteredGuests = availableGuests.filter(guest =>
    !selectedGuests.some(selected => selected.id === guest.id) &&
    (guest.first_name.toLowerCase().includes(searchGuest.toLowerCase()) ||
     guest.last_name.toLowerCase().includes(searchGuest.toLowerCase()) ||
     guest.email.toLowerCase().includes(searchGuest.toLowerCase()))
  )

  const filteredEvents = availableEvents.filter(event =>
    !selectedEvents.some(selected => selected.event_id === event.id) &&
    event.name.toLowerCase().includes(searchEvent.toLowerCase())
  )

  const handleAddGuest = (guest: GuestOption) => {
    setSelectedGuests(prev => [...prev, guest])
    setSearchGuest('')
  }

  const handleRemoveGuest = (guestId: string) => {
    setSelectedGuests(prev => prev.filter(guest => guest.id !== guestId))
  }

  const handleAddEvent = (event: EventOption) => {
    // Calculate max headcount based on selected guests' total_guests or config
    const maxHeadcount = getMaxHeadcountForSelectedGuests()
    const defaultHeadcount = config?.plus_ones_enabled ? Math.min(maxHeadcount, config.max_party_size || 1) : 1
    
    setSelectedEvents(prev => [...prev, {
      event_id: event.id,
      headcount: defaultHeadcount,
      status: 'pending',
    }])
    setSearchEvent('')
  }

  // Helper function to get max headcount based on selected guests' total_guests
  const getMaxHeadcountForSelectedGuests = (): number => {
    if (selectedGuests.length === 0) {
      return config?.max_party_size || 1
    }
    // Use minimum total_guests among selected guests to ensure all can accommodate
    const minTotalGuests = Math.min(...selectedGuests.map(g => g.total_guests || 1))
    return minTotalGuests
  }

  const handleRemoveEvent = (eventId: string) => {
    setSelectedEvents(prev => prev.filter(event => event.event_id !== eventId))
  }

  const handleEventChange = (eventId: string, field: string, value: any) => {
    if (field === 'status') {
      setSelectedEvents(prev => prev.map(event => 
        event.event_id === eventId 
          ? { ...event, [field]: value }
          : event
      ))
    } else if (field === 'headcount') {
      // Only allow headcount changes if plus-ones are enabled
      if (config?.plus_ones_enabled) {
        // Enforce limit based on guest's total_guests or config max_party_size
        const guestMaxHeadcount = getMaxHeadcountForSelectedGuests()
        const configMaxHeadcount = config.max_party_size || 1
        const maxHeadcount = Math.min(guestMaxHeadcount, configMaxHeadcount)
        const clampedValue = Math.min(Math.max(value, 1), maxHeadcount)
        
        setSelectedEvents(prev => prev.map(event => 
          event.event_id === eventId 
            ? { ...event, [field]: clampedValue }
            : event
        ))
      }
    }
  }

  const handleSubmit = () => {
    if (selectedGuests.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one guest",
        variant: "destructive",
      })
      return
    }

    if (selectedEvents.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one event",
        variant: "destructive",
      })
      return
    }

    // Validate headcount against guest's total_guests
    const maxHeadcount = getMaxHeadcountForSelectedGuests()
    const configMaxHeadcount = config?.max_party_size || 1
    const effectiveMaxHeadcount = Math.min(maxHeadcount, configMaxHeadcount)
    
    for (const eventData of selectedEvents) {
      if (eventData.headcount > effectiveMaxHeadcount) {
        toast({
          title: "Error",
          description: `Headcount (${eventData.headcount}) exceeds the maximum allowed (${effectiveMaxHeadcount}) based on selected guest's total_guests limit`,
          variant: "destructive",
        })
        return
      }
    }

    onSave({
      guest_ids: selectedGuests.map(guest => guest.id),
      events: selectedEvents,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {invitation ? 'Edit Invitation' : 'Create Invitation'}
          </DialogTitle>
          <DialogDescription>
            {invitation 
              ? 'Update the invitation details and events.'
              : 'Create a new invitation for selected guests and events.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guests Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Guests */}
              {selectedGuests.length > 0 && (
                <div className="space-y-2">
                  <Label>Selected Guests</Label>
                  <div className="flex flex-wrap gap-2">
                    {selectedGuests.map(guest => (
                      <Badge key={guest.id} variant="secondary" className="flex items-center gap-2">
                        {guest.first_name} {guest.last_name}
                        {guest.is_vip && <span className="text-gold-600">★</span>}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 hover:bg-red-100"
                          onClick={() => handleRemoveGuest(guest.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Search */}
              <div className="space-y-2">
                <Label>Add Guest</Label>
                <Input
                  placeholder="Search guests by name or email..."
                  value={searchGuest}
                  onChange={(e) => setSearchGuest(e.target.value)}
                />
                {searchGuest && filteredGuests.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredGuests.map(guest => (
                      <div
                        key={guest.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleAddGuest(guest)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {guest.first_name} {guest.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{guest.email}</div>
                          </div>
                          {guest.is_vip && <span className="text-gold-600">★</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Events Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Selected Events */}
              {selectedEvents.length > 0 && (
                <div className="space-y-4">
                  <Label>Selected Events</Label>
                  {selectedEvents.map((eventData, index) => {
                    const event = availableEvents.find(e => e.id === eventData.event_id)
                    return (
                      <Card key={eventData.event_id} className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-3">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{event?.name}</h4>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                                onClick={() => handleRemoveEvent(eventData.event_id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            {event && (
                              <div className="text-sm text-gray-600 space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {new Date(event.starts_at).toLocaleDateString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {new Date(event.starts_at).toLocaleTimeString()}
                                </div>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4" />
                                  {event.venue}
                                </div>
                              </div>
                            )}

                            <div className="space-y-2">
                              <Label htmlFor={`status-${index}`}>Status</Label>
                              <Select
                                value={eventData.status}
                                onValueChange={(value) => handleEventChange(eventData.event_id, 'status', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Pending</SelectItem>
                                  <SelectItem value="accepted">Accepted</SelectItem>
                                  <SelectItem value="declined">Declined</SelectItem>
                                  <SelectItem value="waitlist">Waitlist</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`headcount-${index}`}>
                                Headcount
                                {!config?.plus_ones_enabled && ' (Fixed at 1)'}
                              </Label>
                              <Input
                                id={`headcount-${index}`}
                                type="number"
                                min="1"
                                max={Math.min(getMaxHeadcountForSelectedGuests(), config?.max_party_size || 1)}
                                value={eventData.headcount}
                                onChange={(e) => handleEventChange(eventData.event_id, 'headcount', parseInt(e.target.value, 10))}
                                disabled={!config?.plus_ones_enabled}
                              />
                              <p className="text-xs text-gray-500">
                                {config?.plus_ones_enabled 
                                  ? `Number of people (including main guest) - Max: ${Math.min(getMaxHeadcountForSelectedGuests(), config.max_party_size || 1)}${selectedGuests.length > 0 && selectedGuests.some(g => g.total_guests && g.total_guests < (config.max_party_size || 1)) ? ` (based on guest's total_guests)` : ''}`
                                  : 'Plus-ones are disabled - headcount fixed at 1'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )
                  })}
                </div>
              )}

              {/* Event Search */}
              <div className="space-y-2">
                <Label>Add Event</Label>
                <Input
                  placeholder="Search events by name..."
                  value={searchEvent}
                  onChange={(e) => setSearchEvent(e.target.value)}
                />
                {searchEvent && filteredEvents.length > 0 && (
                  <div className="border rounded-md max-h-40 overflow-y-auto">
                    {filteredEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                        onClick={() => handleAddEvent(event)}
                      >
                        <div className="font-medium">{event.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(event.starts_at).toLocaleDateString()} at {event.venue}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving...' : invitation ? 'Update Invitation' : 'Create Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
