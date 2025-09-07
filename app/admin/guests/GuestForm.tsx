'use client'

import { useState, useEffect } from 'react'
import { Guest, Invitation } from '@/lib/types/guests'
import { guestSchema, invitationSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
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
    plus_ones_allowed: number
    gender: 'male' | 'female' | ''
  }>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    household_id: '',
    household_name: '',
    is_vip: false,
    plus_ones_allowed: 0,
    gender: '',
  })
  const [invitationData, setInvitationData] = useState<{
    event_ids: string[]
    headcount: number
  }>({
    event_ids: [],
    headcount: 1,
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
          email: guest.email,
          phone: guest.phone || '',
          household_id: guest.household_id || 'none',
          household_name: '',
          is_vip: guest.is_vip,
          plus_ones_allowed: guest.plus_ones_allowed,
          gender: guest.gender || '',
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
          plus_ones_allowed: 0,
          gender: '',
        })
      }
      setInvitationData({ event_ids: [], headcount: 1 })
      setCreateInvitation(false)
      setErrors({})
    }
  }, [open, guest])

  const loadEvents = async () => {
    try {
      setLoadingEvents(true)
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name')
      
      if (error) {
        console.error('Error loading events:', error)
        toast({
          title: "Error",
          description: `Failed to load events: ${error.message}`,
          variant: "destructive",
        })
        return
      }
      
      setEvents(data || [])
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

  const handleInvitationChange = (field: string, value: string | number | string[]) => {
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
    
    // Manual validation for required fields
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required'
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required'
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address'
    }
    
    // Validate invitation data if creating invitation
    if (createInvitation) {
      if (invitationData.event_ids.length === 0) {
        newErrors.event_ids = 'At least one event is required when creating invitation'
      }
    }
    
    setErrors(newErrors)
    console.log('Validation errors:', newErrors)
    console.log('Form data being validated:', formData)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('Form data:', formData)
    console.log('Invitation data:', invitationData)
    console.log('Create invitation:', createInvitation)
    
    if (!validateForm()) {
      console.log('Validation failed, errors should be displayed')
      return
    }

    setLoading(true)
    try {
      const guestPayload = {
        ...formData,
        household_id: formData.household_id === 'none' ? undefined : formData.household_id || undefined,
        household_name: formData.household_name || undefined,
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
      }

      const invitationPayload = createInvitation && invitationData.event_ids.length > 0 ? {
        event_ids: invitationData.event_ids,
        headcount: invitationData.headcount
      } : undefined
      
      console.log('Sending guest payload:', guestPayload)
      console.log('Sending invitation payload:', invitationPayload)
      
      await onSave({ guest: guestPayload, invitation: invitationPayload })
      
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 px-1">
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
              <Label htmlFor="last_name">Last Name *</Label>
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
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={errors.email ? 'border-red-500' : ''}
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
              <Label htmlFor="household_id">Household</Label>
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
              <Label htmlFor="household_name">Or create new household</Label>
              <Input
                id="household_name"
                value={formData.household_name}
                onChange={(e) => handleInputChange('household_name', e.target.value)}
                placeholder="Enter household name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_vip"
                checked={formData.is_vip}
                onCheckedChange={(checked) => handleInputChange('is_vip', checked)}
              />
              <Label htmlFor="is_vip">VIP Guest</Label>
            </div>
            <div>
              <Label htmlFor="plus_ones_allowed">Plus Ones Allowed</Label>
              <Input
                id="plus_ones_allowed"
                type="number"
                min="0"
                max="10"
                value={formData.plus_ones_allowed}
                onChange={(e) => handleInputChange('plus_ones_allowed', parseInt(e.target.value) || 0)}
                className={errors.plus_ones_allowed ? 'border-red-500' : ''}
              />
              {errors.plus_ones_allowed && (
                <p className="text-sm text-red-500 mt-1">{errors.plus_ones_allowed}</p>
              )}
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
          </div>

          {/* Invitation Section */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="create_invitation"
                checked={createInvitation}
                onCheckedChange={(checked) => setCreateInvitation(checked as boolean)}
              />
              <Label htmlFor="create_invitation" className="text-lg font-medium">
                Create invitation with RSVP code
              </Label>
            </div>
            
            {createInvitation && (
              <div className="space-y-4">
                <div>
                  <Label>Select Events *</Label>
                  {loadingEvents ? (
                    <div className="text-sm text-muted-foreground">Loading events...</div>
                  ) : (
                    <div className={`grid grid-cols-1 gap-3 mt-2 max-h-40 overflow-y-auto border rounded-md p-3 ${errors.event_ids ? 'border-red-500' : ''}`}>
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
                <div>
                  <Label htmlFor="headcount">Headcount</Label>
                  <Input
                    id="headcount"
                    type="number"
                    min="1"
                    max="20"
                    value={invitationData.headcount}
                    onChange={(e) => handleInvitationChange('headcount', parseInt(e.target.value) || 1)}
                    className={errors.headcount ? 'border-red-500' : ''}
                  />
                  {errors.headcount && (
                    <p className="text-sm text-red-500 mt-1">{errors.headcount}</p>
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
