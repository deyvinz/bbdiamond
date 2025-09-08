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
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Calendar, MapPin, Clock, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/hooks/use-toast'
import type { Invitation, InvitationEvent } from '@/lib/invitations-service'

interface SendEmailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invitation?: Invitation
  onSend: (data: {
    invitationId: string
    eventId: string
    email?: string
  }) => void
  loading?: boolean
}

interface RateLimitInfo {
  sentToday: number
  maxPerDay: number
  canSend: boolean
}

export default function SendEmailDialog({
  open,
  onOpenChange,
  invitation,
  onSend,
  loading = false,
}: SendEmailDialogProps) {
  const [selectedEventId, setSelectedEventId] = useState<string>('')
  const [emailOverride, setEmailOverride] = useState<string>('')
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && invitation) {
      setSelectedEventId(invitation.invitation_events[0]?.event_id || '')
      setEmailOverride('')
      loadRateLimitInfo()
    } else {
      setSelectedEventId('')
      setEmailOverride('')
      setRateLimitInfo(null)
    }
  }, [open, invitation])

  const loadRateLimitInfo = async () => {
    if (!invitation) return

    try {
      // TODO: Implement actual API call to get rate limit info
      // For now, mock the data
      setRateLimitInfo({
        sentToday: 1,
        maxPerDay: 3,
        canSend: true,
      })
    } catch (error) {
      console.error('Failed to load rate limit info:', error)
    }
  }

  const selectedEvent = invitation?.invitation_events.find(
    event => event.event_id === selectedEventId
  )

  const handleSend = () => {
    if (!invitation || !selectedEventId) {
      toast({
        title: "Error",
        description: "Please select an event",
        variant: "destructive",
      })
      return
    }

    if (rateLimitInfo && !rateLimitInfo.canSend) {
      toast({
        title: "Rate Limit Exceeded",
        description: "Daily email limit reached for this invitation",
        variant: "destructive",
      })
      return
    }

    onSend({
      invitationId: invitation.id,
      eventId: selectedEventId,
      email: emailOverride || undefined,
    })
  }

  if (!invitation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invitation Email
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to {invitation.guest.first_name} {invitation.guest.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Guest Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Guest Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="font-medium">
                  {invitation.guest.first_name} {invitation.guest.last_name}
                </div>
                <div className="text-sm text-gray-600">
                  {invitation.guest.email}
                </div>
                <div className="text-xs text-gray-500">
                  Invite Code: {invitation.guest.invite_code}
                </div>
                {invitation.guest.is_vip && (
                  <Badge className="bg-gold-100 text-gold-800 border-gold-300">
                    VIP Guest
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Event Selection */}
          <div className="space-y-2">
            <Label htmlFor="event-select">Select Event</Label>
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an event" />
              </SelectTrigger>
              <SelectContent>
                {invitation.invitation_events.map((event) => (
                  <SelectItem key={event.event_id} value={event.event_id}>
                    {event.event.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Details */}
          {selectedEvent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Event Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="font-medium text-lg">
                    {selectedEvent.event.name}
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(selectedEvent.event.starts_at), 'EEEE, MMMM d, yyyy')}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {format(new Date(selectedEvent.event.starts_at), 'h:mm a')}
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedEvent.event.venue}
                    </div>
                    {selectedEvent.event.address && (
                      <div className="ml-6 text-gray-500">
                        {selectedEvent.event.address}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <Badge
                      variant={
                        selectedEvent.status === 'accepted' 
                          ? 'default'
                          : selectedEvent.status === 'pending'
                          ? 'outline'
                          : selectedEvent.status === 'declined'
                          ? 'secondary'
                          : 'outline'
                      }
                      className={
                        selectedEvent.status === 'accepted' 
                          ? 'bg-gold-100 text-gold-800 border-gold-300'
                          : selectedEvent.status === 'pending'
                          ? 'bg-gray-100 text-gray-800 border-gray-300'
                          : selectedEvent.status === 'declined'
                          ? 'bg-red-100 text-red-800 border-red-300'
                          : 'bg-amber-100 text-amber-800 border-amber-300'
                      }
                    >
                      {selectedEvent.status.charAt(0).toUpperCase() + selectedEvent.status.slice(1)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      Headcount: {selectedEvent.headcount}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Email Override */}
          <div className="space-y-2">
            <Label htmlFor="email-override">Email Address (Optional)</Label>
            <Input
              id="email-override"
              type="email"
              placeholder={invitation.guest.email}
              value={emailOverride}
              onChange={(e) => setEmailOverride(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              Leave empty to use the guest's registered email address
            </p>
          </div>

          {/* Rate Limit Info */}
          {rateLimitInfo && (
            <Alert className={rateLimitInfo.canSend ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {rateLimitInfo.canSend ? (
                  <span className="text-green-800">
                    Emails sent today: {rateLimitInfo.sentToday}/{rateLimitInfo.maxPerDay}
                  </span>
                ) : (
                  <span className="text-red-800">
                    Daily email limit reached ({rateLimitInfo.sentToday}/{rateLimitInfo.maxPerDay}). 
                    Try again tomorrow.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading || !selectedEventId || (rateLimitInfo ? !rateLimitInfo.canSend : false)}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {loading ? 'Sending...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
