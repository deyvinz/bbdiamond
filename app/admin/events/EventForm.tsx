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
import { useToast } from '@/components/ui/use-toast'
import type { Event } from '@/lib/events-service'
import type { CreateEventInput, UpdateEventInput } from '@/lib/validators'
import IconPicker from './IconPicker'

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
    icon: undefined as string | undefined,
  })
  const { toast } = useToast()

  // Initialize form with existing event data
  useEffect(() => {
    if (event) {
      // For timestamp (no timezone): Display the stored time as-is without conversion
      // Convert database format (YYYY-MM-DD HH:MM:SS) to form format (YYYY-MM-DDTHH:MM)
      const [datePart, timePart] = event.starts_at.split(' ')
      const [hours, minutes] = timePart.split(':')
      const localDateTime = `${datePart}T${hours}:${minutes}`
      
      setFormData({
        name: event.name,
        venue: event.venue,
        address: event.address || '',
        starts_at: localDateTime,
        icon: event.icon,
      })
    } else {
      setFormData({
        name: '',
        venue: '',
        address: '',
        starts_at: '',
        icon: undefined,
      })
    }
  }, [event, open])

  // Show helpful notification when form opens
  useEffect(() => {
    if (open) {
      if (event) {
        toast({
          title: "📝 Editing Event",
          description: `You are editing "${event.name}". Make your changes and save.`,
        })
      } else {
        toast({
          title: "➕ Creating New Event",
          description: "Fill in the details below to create a new wedding event.",
        })
      }
    }
  }, [open, event, toast])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.name.trim()) {
      toast({
        title: "❌ Missing Event Name",
        description: "Please enter a name for the event",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.venue.trim()) {
      toast({
        title: "❌ Missing Venue",
        description: "Please enter the venue for the event",
        variant: "destructive",
      })
      return
    }
    
    if (!formData.starts_at) {
      toast({
        title: "❌ Missing Date & Time",
        description: "Please select the date and time for the event",
        variant: "destructive",
      })
      return
    }

    // Validate date is not in the past
    const selectedDate = new Date(formData.starts_at)
    const now = new Date()
    if (selectedDate < now) {
      toast({
        title: "❌ Invalid Date",
        description: "Event date cannot be in the past",
        variant: "destructive",
      })
      return
    }

    // For timestamp (no timezone): Store the datetime exactly as entered
    // Parse the datetime-local input format (YYYY-MM-DDTHH:MM) directly
    const [datePart, timePart] = formData.starts_at.split('T')
    const startsAt = `${datePart} ${timePart}:00`

    const eventData = {
      name: formData.name.trim(),
      venue: formData.venue.trim(),
      address: formData.address.trim() || undefined,
      starts_at: startsAt,
      icon: formData.icon || undefined,
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
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

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 space-y-4">
          <div className="flex-1 overflow-y-auto pr-2 space-y-4">
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

            <div className="space-y-2">
              <IconPicker
                value={formData.icon}
                onChange={(icon) => setFormData(prev => ({ ...prev, icon }))}
              />
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 pt-4 border-t">
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
