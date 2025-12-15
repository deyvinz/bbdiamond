'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { AlertCircle, Send, Loader2 } from 'lucide-react'
import { sendInviteEmailAction } from '@/lib/actions/invitations'
import { sendRsvpReminderAction } from '@/lib/actions/rsvp-reminders'

interface GroupedGuest {
  guest_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  invitation_events_count: number
  notifications_received: number
  missing_count: number
  invitation_ids?: string[]
  invitation_event_ids?: Record<string, string[]> // Map of invitation ID to event IDs
}

interface ResendNotificationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  guests: GroupedGuest[]
  onComplete: () => void
}

type NotificationType = 'invitation' | 'rsvp_reminder'

export default function ResendNotificationsDialog({
  open,
  onOpenChange,
  guests,
  onComplete,
}: ResendNotificationsDialogProps) {
  const { toast } = useToast()
  const [notificationTypes, setNotificationTypes] = useState<Map<string, NotificationType>>(new Map())
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<Map<string, { success: boolean; message: string }>>(new Map())

  // Initialize default notification types when dialog opens
  useEffect(() => {
    if (open && guests.length > 0) {
      const defaultTypes = new Map<string, NotificationType>()
      guests.forEach(guest => {
        const guestKey = guest.guest_id || guest.guest_name
        // Default to invitation if guest has missing notifications
        defaultTypes.set(guestKey, 'invitation')
      })
      setNotificationTypes(defaultTypes)
      setResults(new Map())
    }
  }, [open, guests])

  const handleNotificationTypeChange = (guestKey: string, type: NotificationType) => {
    setNotificationTypes(prev => {
      const newMap = new Map(prev)
      newMap.set(guestKey, type)
      return newMap
    })
  }

  const handleResend = async () => {
    if (guests.length === 0) {
      return
    }

    setSending(true)
    setResults(new Map())
    const newResults = new Map<string, { success: boolean; message: string }>()

    try {
      for (const guest of guests) {
        const guestKey = guest.guest_id || guest.guest_name
        const notificationType = notificationTypes.get(guestKey) || 'invitation'
        
        // Get the first invitation ID for this guest
        const invitationId = guest.invitation_ids?.[0]
        
        if (!invitationId) {
          newResults.set(guestKey, {
            success: false,
            message: 'No invitation found for this guest',
          })
          continue
        }

        try {
          if (notificationType === 'invitation') {
            // Get event IDs from the invitation_event_ids map
            let eventIds: string[] = []
            if (guest.invitation_event_ids && guest.invitation_event_ids[invitationId]) {
              eventIds = guest.invitation_event_ids[invitationId]
            }
            
            if (eventIds.length === 0) {
              newResults.set(guestKey, {
                success: false,
                message: 'No events found for this invitation',
              })
              continue
            }
            
            // Send invitation notification
            const result = await sendInviteEmailAction({
              invitationId,
              eventIds,
              includeQr: true,
              ignoreRateLimit: true,
            })
            
            newResults.set(guestKey, {
              success: result.success || false,
              message: result.message || (result.success ? 'Invitation sent successfully' : 'Failed to send invitation'),
            })
          } else if (notificationType === 'rsvp_reminder') {
            // Send RSVP reminder
            const result = await sendRsvpReminderAction({
              invitationId,
              to: guest.guest_email || undefined,
            })
            
            newResults.set(guestKey, {
              success: result.success || false,
              message: result.message || (result.success ? 'RSVP reminder sent successfully' : 'Failed to send reminder'),
            })
          }
        } catch (error) {
          newResults.set(guestKey, {
            success: false,
            message: error instanceof Error ? error.message : 'Failed to send notification',
          })
        }
      }

      setResults(newResults)

      // Show summary toast
      const successCount = Array.from(newResults.values()).filter(r => r.success).length
      const failCount = guests.length - successCount

      if (successCount > 0 && failCount === 0) {
        toast({
          title: 'Success',
          description: `Notifications sent successfully to ${successCount} guest${successCount !== 1 ? 's' : ''}`,
        })
        onComplete()
        onOpenChange(false)
      } else if (successCount > 0) {
        toast({
          title: 'Partial Success',
          description: `Sent to ${successCount} guest${successCount !== 1 ? 's' : ''}, ${failCount} failed`,
          variant: 'default',
        })
      } else {
        toast({
          title: 'Error',
          description: `Failed to send notifications to ${failCount} guest${failCount !== 1 ? 's' : ''}`,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error resending notifications:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred while sending notifications',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  const handleClose = () => {
    if (!sending) {
      setNotificationTypes(new Map())
      setResults(new Map())
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Resend Notifications</DialogTitle>
          <DialogDescription>
            Select notification type for each guest and resend notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {guests.map((guest) => {
            const guestKey = guest.guest_id || guest.guest_name
            const notificationType = notificationTypes.get(guestKey) || 'invitation'
            const result = results.get(guestKey)

            return (
              <div key={guestKey} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{guest.guest_name}</h4>
                      {guest.missing_count > 0 && (
                        <Badge className="bg-orange-100 text-orange-800">
                          {guest.missing_count} missing
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      {guest.guest_email && (
                        <div>Email: {guest.guest_email}</div>
                      )}
                      {guest.guest_phone && (
                        <div>Phone: {guest.guest_phone}</div>
                      )}
                      <div>
                        Invitation Events: {guest.invitation_events_count} | 
                        Notifications Received: {guest.notifications_received}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`notification-type-${guestKey}`}>Notification Type</Label>
                  <Select
                    value={notificationType}
                    onValueChange={(value) => handleNotificationTypeChange(guestKey, value as NotificationType)}
                    disabled={sending}
                  >
                    <SelectTrigger id={`notification-type-${guestKey}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invitation">Invitation</SelectItem>
                      <SelectItem value="rsvp_reminder">RSVP Reminder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {result && (
                  <div className={`p-2 rounded text-sm ${
                    result.success 
                      ? 'bg-green-50 text-green-800 border border-green-200' 
                      : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2">
                      {result.success ? (
                        <span className="font-medium">✓ {result.message}</span>
                      ) : (
                        <span className="font-medium">✗ {result.message}</span>
                      )}
                    </div>
                  </div>
                )}

                {!guest.invitation_ids || guest.invitation_ids.length === 0 ? (
                  <div className="p-2 bg-yellow-50 text-yellow-800 border border-yellow-200 rounded text-sm">
                    <AlertCircle className="h-4 w-4 inline mr-2" />
                    No invitation found for this guest
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleResend}
            disabled={sending || guests.length === 0}
            className="bg-gold-600 text-white hover:bg-gold-700"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Resend Notifications
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
