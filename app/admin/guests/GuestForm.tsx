'use client'

import { useState, useEffect } from 'react'
import { Guest } from '@/lib/types/guests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase-browser'

interface GuestFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guest?: Guest
  onSave: (data: { guest: any; invitation?: any }) => void
}

interface Event {
  id: string
  name: string
}

function GuestForm({ open, onOpenChange, guest, onSave }: GuestFormProps) {
  const [formData, setFormData] = useState<{
    first_name: string
    last_name: string
    email: string
    phone: string
    household_id: string
    household_name: string
    is_vip: boolean
    gender: 'male' | 'female' | ''
    total_guests: number
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    household_id: '',
    household_name: '',
    is_vip: false,
    gender: '',
    total_guests: 1,
  })
  const [invitationData, setInvitationData] = useState<{
    event_ids: string[]
  }>({
    event_ids: [],
  })
  const [createInvitation, setCreateInvitation] = useState(false)
  const [events, setEvents] = useState<Event[]>([])
  const [households, setHouseholds] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadEvents()
      loadHouseholds()
      
      if (guest) {
        setFormData({
          first_name: guest.first_name,
          last_name: guest.last_name,
          email: guest.email || '',
          phone: guest.phone || '',
          household_id: guest.household_id || 'none',
          household_name: '',
          is_vip: guest.is_vip,
          gender: guest.gender || '',
          total_guests: guest.total_guests || 1,
        })
      } else {
        setFormData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
          household_id: 'none',
          household_name: '',
          is_vip: false,
          gender: '',
          total_guests: 1,
        })
      }
      setInvitationData({ event_ids: [] })
      setCreateInvitation(false)
      setErrors({})
    }
  }, [open, guest])

  const loadEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch('/api/events')
      const data = await response.json()
      
      if (data.success && data.events) {
        setEvents(data.events)
      } else {
        console.error('Failed to load events:', data.error || 'Unknown error')
        toast({
          title: "Error",
          description: `Failed to load events: ${data.error || 'Unknown error'}`,
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading events:', error)
      toast({
        title: "Error",
        description: "Failed to load events. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoadingEvents(false)
    }
  }

  const loadHouseholds = async () => {
    try {
      const { data, error } = await supabase
        .from('households')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      setHouseholds(data || [])
    } catch (error) {
      console.error('Error loading households:', error)
    }
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleInvitationChange = (field: string, value: string | string[]) => {
    setInvitationData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleEventToggle = (eventId: string) => {
    setInvitationData(prev => ({
      ...prev,
      event_ids: prev.event_ids.includes(eventId)
        ? prev.event_ids.filter(id => id !== eventId)
        : [...prev.event_ids, eventId]
    }))
    if (errors.event_ids) {
      setErrors(prev => ({ ...prev, event_ids: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Required fields validation
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    
    // Optional fields validation - only validate format if provided
    // Last name is optional - no validation needed
    
    // Email is optional, but if provided, must be valid format
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.email.trim())) {
        newErrors.email = 'Invalid email address'
      }
    }
    
    // Total guests validation
    if (formData.total_guests < 1 || formData.total_guests > 20) {
      newErrors.total_guests = 'Total guests must be between 1 and 20'
    }
    
    // Validate invitation data if creating invitation
    if (createInvitation) {
      if (invitationData.event_ids.length === 0) {
        newErrors.event_ids = 'At least one event is required when creating invitation'
      }
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
      
    
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      const guestPayload = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name?.trim() || undefined,
        email: formData.email?.trim() || undefined,
        phone: formData.phone?.trim() || undefined,
        household_id: formData.household_id === 'none' ? undefined : formData.household_id || undefined,
        household_name: formData.household_name?.trim() || undefined,
        is_vip: formData.is_vip,
        gender: formData.gender || undefined,
        total_guests: formData.total_guests || 1,
      }

      const invitationPayload = createInvitation && invitationData.event_ids.length > 0 ? {
        event_ids: invitationData.event_ids
      } : undefined
      
      onSave({ guest: guestPayload, invitation: invitationPayload })
      
      toast({
        title: "Success",
        description: guest ? "Guest updated successfully" : "Guest created successfully",
      })
      
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating guest:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {guest ? 'Edit Guest' : 'Add New Guest'}
          </DialogTitle>
          <DialogDescription>
            {guest ? 'Update guest information and invitation details.' : 'Add a new guest to the wedding list.'}
          </DialogDescription>
          <div className="text-xs text-gray-500 mt-2">
            <span className="text-red-500">*</span> Required fields
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-1">
          {/* Personal Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className={errors.first_name ? 'border-red-500' : ''}
                />
                {errors.first_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.first_name}</p>
                )}
              </div>
              <div>
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className={errors.last_name ? 'border-red-500' : ''}
                />
                {errors.last_name && (
                  <p className="text-sm text-red-500 mt-1">{errors.last_name}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className={errors.email ? 'border-red-500' : ''}
                  placeholder="Optional"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email}</p>
                )}
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => handleInputChange('gender', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_vip"
                  checked={formData.is_vip}
                  onCheckedChange={(checked) => handleInputChange('is_vip', checked)}
                />
                <Label htmlFor="is_vip">VIP Guest</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="total_guests">Total Guests (Household Size)</Label>
              <Input
                id="total_guests"
                type="number"
                min="1"
                max="20"
                value={formData.total_guests}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10)
                  if (!isNaN(value) && value >= 1 && value <= 20) {
                    handleInputChange('total_guests', value)
                  } else if (e.target.value === '') {
                    handleInputChange('total_guests', 1)
                  }
                }}
                className={errors.total_guests ? 'border-red-500' : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total number of guests allowed for this household head. Max plus-ones = total_guests - 1.
              </p>
              {errors.total_guests && (
                <p className="text-sm text-red-500 mt-1">{errors.total_guests}</p>
              )}
            </div>
          </div>

          {/* Household Information Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Household Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="household_id">Existing Household</Label>
                <Select
                  value={formData.household_id}
                  onValueChange={(value) => handleInputChange('household_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select household" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No household</SelectItem>
                    {households.map((household) => (
                      <SelectItem key={household.id} value={household.id}>
                        {household.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="household_name">Or Create New Household</Label>
                <Input
                  id="household_name"
                  value={formData.household_name}
                  onChange={(e) => handleInputChange('household_name', e.target.value)}
                  placeholder="Enter household name"
                />
              </div>
            </div>
          </div>

          {/* Invitation Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 border-b pb-2">Invitation Settings</h3>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="create_invitation"
                checked={createInvitation}
                onCheckedChange={(checked) => setCreateInvitation(checked as boolean)}
              />
              <Label htmlFor="create_invitation" className="text-base font-medium">
                Create invitation with RSVP code
              </Label>
            </div>
            
            {createInvitation && (
              <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Select Events *</Label>
                  <p className="text-xs text-gray-600 mb-3">Choose which events this guest will be invited to</p>
                  {loadingEvents ? (
                    <div className="text-sm text-muted-foreground">Loading events...</div>
                  ) : (
                    <div className={`grid grid-cols-1 gap-3 max-h-40 overflow-y-auto border rounded-md p-3 bg-white ${errors.event_ids ? 'border-red-500' : 'border-gray-200'}`}>
                      {events.map((event) => (
                        <div key={event.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`event-${event.id}`}
                            checked={invitationData.event_ids.includes(event.id)}
                            onCheckedChange={() => handleEventToggle(event.id)}
                          />
                          <Label 
                            htmlFor={`event-${event.id}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {event.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.event_ids && (
                    <p className="text-sm text-red-500 mt-1">{errors.event_ids}</p>
                  )}
                </div>
              </div>
            )}
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
              {loading ? 'Saving...' : guest ? 'Update Guest' : 'Create Guest'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default GuestForm
