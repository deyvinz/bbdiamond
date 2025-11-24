'use client'

import { useState, useEffect, useRef } from 'react'
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
import Image from 'next/image'
import { Upload, X } from 'lucide-react'

interface EventFormProps {
  open: boolean
  // Note: Function props are valid for client components. Next.js serialization warning is a false positive.
  onOpenChange: (open: boolean) => void
  event?: Event
  // Note: Function props are valid for client components. Next.js serialization warning is a false positive.
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
  // Internal handler wrapper
  const handleDialogOpenChange = (newOpen: boolean) => {
    onOpenChange(newOpen)
  }
  const [formData, setFormData] = useState({
    name: '',
    venue: '',
    address: '',
    starts_at: '',
    icon: undefined as string | undefined,
  })
  const [pictureUrl, setPictureUrl] = useState<string | null>(null)
  const [uploadingPicture, setUploadingPicture] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
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
      setPictureUrl(event.picture_url || null)
    } else {
      setFormData({
        name: '',
        venue: '',
        address: '',
        starts_at: '',
        icon: undefined,
      })
      setPictureUrl(null)
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

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !event) return

    setUploadingPicture(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/admin/events/${event.id}/upload-picture`, {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (data.success) {
        setPictureUrl(data.url)
        toast({
          title: "✅ Picture Uploaded",
          description: "Event picture has been uploaded successfully.",
        })
      } else {
        throw new Error(data.error || 'Failed to upload picture')
      }
    } catch (error) {
      console.error('Error uploading picture:', error)
      toast({
        title: "❌ Upload Failed",
        description: error instanceof Error ? error.message : "Failed to upload picture",
        variant: "destructive",
      })
    } finally {
      setUploadingPicture(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemovePicture = async () => {
    if (!event || !pictureUrl) return

    try {
      const response = await fetch(`/api/admin/events/${event.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ picture_url: null }),
      })

      if (response.ok) {
        setPictureUrl(null)
        toast({
          title: "✅ Picture Removed",
          description: "Event picture has been removed.",
        })
      } else {
        throw new Error('Failed to remove picture')
      }
    } catch (error) {
      console.error('Error removing picture:', error)
      toast({
        title: "❌ Failed to Remove",
        description: "Failed to remove picture. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
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

            {event && (
              <div className="space-y-2">
                <Label>Event Picture</Label>
                {pictureUrl ? (
                  <div className="relative">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border border-gray-200">
                      <Image
                        src={pictureUrl}
                        alt={event.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPicture}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemovePicture}
                        disabled={uploadingPicture}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingPicture}
                      className="w-full"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploadingPicture ? 'Uploading...' : 'Upload Picture'}
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePictureUpload}
                      className="hidden"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Upload a picture of the event venue (max 5MB)
                    </p>
                  </div>
                )}
              </div>
            )}
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
