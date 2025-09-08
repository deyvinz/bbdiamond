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
    eventIds: string[]
    to?: string
    includeQr?: boolean
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
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [emailOverride, setEmailOverride] = useState<string>('')
  const [includeQr, setIncludeQr] = useState<boolean>(true)
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | null>(null)
  const [rateLimitLoading, setRateLimitLoading] = useState<boolean>(false)

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (open && invitation) {
      setSelectedEventIds([])
      setEmailOverride('')
      loadRateLimitInfo()
    } else {
      setSelectedEventIds([])
      setEmailOverride('')
      setRateLimitInfo(null)
    }
  }, [open, invitation])

  const loadRateLimitInfo = async () => {
    if (!invitation) return

    setRateLimitLoading(true)
    try {
      const response = await fetch(`/api/admin/invitations/${invitation.id}/rate-limit`)
      if (response.ok) {
        const data = await response.json()
        setRateLimitInfo({
          sentToday: data.sentToday,
          maxPerDay: data.maxPerDay,
          canSend: data.canSend,
        })
      } else {
        console.error('Failed to load rate limit info:', response.statusText)
        // Fallback to default values
        setRateLimitInfo({
          sentToday: 0,
          maxPerDay: 3,
          canSend: true,
        })
      }
    } catch (error) {
      console.error('Failed to load rate limit info:', error)
      // Fallback to default values
      setRateLimitInfo({
        sentToday: 0,
        maxPerDay: 3,
        canSend: true,
      })
    } finally {
      setRateLimitLoading(false)
    }
  }

  const selectedEvents = invitation?.invitation_events.filter(
    event => selectedEventIds.includes(event.event_id)
  ) || []

  const handleSend = () => {
    if (!invitation || selectedEventIds.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one event",
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
      eventIds: selectedEventIds,
      to: emailOverride || undefined,
      includeQr,
    })
  }

  if (!invitation) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invitation Email
          </DialogTitle>
          <DialogDescription>
            Send an invitation email to {invitation.guest.first_name} {invitation.guest.last_name}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-2 pb-4">
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
            <Label>Select Events</Label>
            <div className="space-y-2">
              {invitation.invitation_events.map((event) => (
                <div key={event.event_id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`event-${event.event_id}`}
                    checked={selectedEventIds.includes(event.event_id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEventIds([...selectedEventIds, event.event_id])
                      } else {
                        setSelectedEventIds(selectedEventIds.filter(id => id !== event.event_id))
                      }
                    }}
                    className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                  />
                  <label htmlFor={`event-${event.event_id}`} className="text-sm font-medium">
                    {event.event.name}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Event Details */}
          {selectedEvents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Selected Events</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedEvents.map((event) => (
                    <div key={event.event_id} className="border rounded-lg p-4 space-y-3">
                      <div className="font-medium text-lg">
                        {event.event.name}
                      </div>
                      
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {format(new Date(event.event.starts_at), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.event.starts_at), 'h:mm a')}
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.event.venue}
                        </div>
                        {event.event.address && (
                          <div className="ml-6 text-gray-500">
                            {event.event.address}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-2">
                        <Badge
                          variant={
                            event.status === 'accepted' 
                              ? 'default'
                              : event.status === 'pending'
                              ? 'outline'
                              : event.status === 'declined'
                              ? 'secondary'
                              : 'outline'
                          }
                          className={
                            event.status === 'accepted' 
                              ? 'bg-gold-100 text-gold-800 border-gold-300'
                              : event.status === 'pending'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : event.status === 'declined'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }
                        >
                          {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          Headcount: {event.headcount}
                        </span>
                      </div>
                    </div>
                  ))}
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

          {/* QR Code Option */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                id="include-qr"
                type="checkbox"
                checked={includeQr}
                onChange={(e) => setIncludeQr(e.target.checked)}
                className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
              />
              <Label htmlFor="include-qr" className="text-sm font-medium">
                Include QR code for check-in
              </Label>
            </div>
            <p className="text-xs text-gray-500">
              QR code will be generated automatically and included in the email
            </p>
          </div>

          {/* Rate Limit Info */}
          {rateLimitLoading ? (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <span className="text-blue-800">
                  Loading rate limit information...
                </span>
              </AlertDescription>
            </Alert>
          ) : rateLimitInfo ? (
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
          ) : null}
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={loading || rateLimitLoading || selectedEventIds.length === 0 || (rateLimitInfo ? !rateLimitInfo.canSend : false)}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {loading ? 'Sending...' : rateLimitLoading ? 'Loading...' : 'Send Email'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
