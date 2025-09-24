'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, MapPin, Clock, Edit, Trash2 } from 'lucide-react'
import EventForm from './EventForm'
import type { Event } from '@/lib/events-service'
import type { CreateEventInput, UpdateEventInput } from '@/lib/validators'

interface EventsClientProps {
  initialEvents: Event[]
}

export default function EventsClient({ initialEvents }: EventsClientProps) {
  const [events, setEvents] = useState<Event[]>(initialEvents)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<Event | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateEvent = async (eventData: CreateEventInput) => {
    setLoading(true)
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create event')
      }

      const newEvent = await response.json()
      setEvents(prev => [...prev, newEvent])
      setShowForm(false)
      
      toast({
        title: "Success",
        description: "Event created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create event",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateEvent = async (eventData: UpdateEventInput) => {
    if (!editingEvent) return

    setLoading(true)
    try {
      const response = await fetch(`/api/events/${editingEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update event')
      }

      const updatedEvent = await response.json()
      setEvents(prev => prev.map(event => 
        event.id === editingEvent.id ? updatedEvent : event
      ))
      setEditingEvent(undefined)
      
      toast({
        title: "Success",
        description: "Event updated successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update event",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete event')
      }

      setEvents(prev => prev.filter(event => event.id !== eventId))
      
      toast({
        title: "Success",
        description: "Event deleted successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete event",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (event: Event) => {
    setEditingEvent(event)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingEvent(undefined)
  }

  const handleFormSave = (data: CreateEventInput | UpdateEventInput) => {
    if (editingEvent) {
      handleUpdateEvent(data as UpdateEventInput)
    } else {
      handleCreateEvent(data as CreateEventInput)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">All Events</h2>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Event
        </Button>
      </div>

      <div className="grid gap-4">
        {events.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No events found. Add your first event above.</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event) => (
            <Card key={event.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <h3 className="text-xl font-semibold">{event.name}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{event.venue}</span>
                    </div>
                    {event.address && (
                      <p className="text-sm text-muted-foreground ml-6">{event.address}</p>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatDate(event.starts_at)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(event)}
                      disabled={loading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteEvent(event.id)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <EventForm
        open={showForm || !!editingEvent}
        onOpenChange={handleFormClose}
        event={editingEvent}
        onSave={handleFormSave}
        loading={loading}
      />
    </div>
  )
}
