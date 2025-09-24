'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import type { Event } from '@/lib/events-service'
import type { CreateEventInput, UpdateEventInput } from '@/lib/validators'

interface EventFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  event?: Event
  onSave: (data: CreateEventInput | UpdateEventInput) => void
  loading?: boolean
}

export default function EventForm({
  open,
  onOpenChange,
  event,
  onSave,
  loading = false,
}: EventFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    address: '',
    starts_at: '',
  })
  const { toast } = useToast()

  // Initialize form with existing event data
  useEffect(() => {
    if (event) {
      // Format datetime-local input (remove timezone info)
      const startsAt = new Date(event.starts_at)
      const localDateTime = new Date(startsAt.getTime() - startsAt.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16)
      
      setFormData({
        name: event.name,
        venue: event.venue,
        address: event.address || '',
        starts_at: localDateTime,
      })
    } else {
      setFormData({
        name: '',
        venue: '',
        address: '',
        starts_at: '',
      })
    }
  }, [event, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim() || !formData.venue.trim() || !formData.starts_at) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Convert local datetime to ISO string
    const startsAt = new Date(formData.starts_at).toISOString()

    const eventData = {
      name: formData.name.trim(),
      venue: formData.venue.trim(),
      address: formData.address.trim() || undefined,
      starts_at: startsAt,
    }

    onSave(eventData)
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {event ? 'Edit Event' : 'Create Event'}
          </DialogTitle>
          <DialogDescription>
            {event 
              ? 'Update the event details below.'
              : 'Create a new wedding event with the details below.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="e.g., Wedding Ceremony"
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="venue">Venue *</Label>
              <Input
                id="venue"
                value={formData.venue}
                onChange={(e) => handleInputChange('venue', e.target.value)}
                placeholder="e.g., St. Mary Church"
                disabled={loading}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder="Full address of the venue"
              rows={2}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="starts_at">Date & Time *</Label>
            <Input
              id="starts_at"
              type="datetime-local"
              value={formData.starts_at}
              onChange={(e) => handleInputChange('starts_at', e.target.value)}
              disabled={loading}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading 
                ? (event ? 'Updating...' : 'Creating...') 
                : (event ? 'Update Event' : 'Create Event')
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
