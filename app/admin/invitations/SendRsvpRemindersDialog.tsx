'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { AlertCircle, Bell } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface Event {
  id: string
  name: string
  starts_at: string
}

interface SendRsvpRemindersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

export default function SendRsvpRemindersDialog({
  open,
  onOpenChange,
  onComplete,
}: SendRsvpRemindersDialogProps) {
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const { toast } = useToast()

  // Load events when dialog opens
  useEffect(() => {
    if (open) {
      loadEvents()
      loadPendingCount()
    }
  }, [open])

  const loadEvents = async () => {
    try {
      setLoadingEvents(true)
      const response = await fetch('/api/events')
      const data = await response.json()

      if (data.success && data.events) {
        const sortedEvents = data.events.sort(
          (a: Event, b: Event) => 
            new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
        )
        setEvents(sortedEvents)
        // Select all events by default
        setSelectedEventIds(sortedEvents.map((e: Event) => e.id))
      }
    } catch (error) {
      console.error('Error loading events:', error)
      toast({
        title: 'Error',
        description: 'Failed to load events',
        variant: 'destructive',
      })
    } finally {
      setLoadingEvents(false)
    }
  }

  const loadPendingCount = async () => {
    try {
      // This would need a dedicated endpoint to count pending RSVPs
      // For now, we'll skip this or implement it later
      setPendingCount(null)
    } catch (error) {
      console.error('Error loading pending count:', error)
    }
  }

  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds(prev =>
      prev.includes(eventId)
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleSelectAll = () => {
    if (selectedEventIds.length === events.length) {
      setSelectedEventIds([])
    } else {
      setSelectedEventIds(events.map(e => e.id))
    }
  }

  const handleSend = async () => {
    if (selectedEventIds.length === 0) {
      toast({
        title: 'No Events Selected',
        description: 'Please select at least one event',
        variant: 'destructive',
      })
      return
    }

    const confirmed = confirm(
      `⚠️ URGENT REMINDER ACTION\n\n` +
      `This will send HIGH PRIORITY RSVP reminder emails to ALL guests who haven't responded for the selected ${selectedEventIds.length} event(s).\n\n` +
      `The emails will:\n` +
      `• Be marked as HIGH IMPORTANCE\n` +
      `• Use urgent language and red warning styling\n` +
      `• Request response within 48 hours\n` +
      `• Be sent from rsvp@brendabagsherdiamond.com\n\n` +
      `Guests who have already RSVP'd (accepted/declined) will be automatically skipped.\n\n` +
      `Are you sure you want to send these urgent reminders?`
    )

    if (!confirmed) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/admin/rsvp-reminders/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventIds: selectedEventIds.length === events.length ? undefined : selectedEventIds,
          ignoreRateLimit: true,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to send reminders')
      }

      toast({
        title: '✅ RSVP Reminders Sent Successfully!',
        description: `Sent ${result.sent} urgent reminders, ${result.skipped} skipped${result.errors.length > 0 ? `, ${result.errors.length} errors` : ''}`,
      })

      if (result.errors.length > 0) {
        console.error('Reminder errors:', result.errors)
        toast({
          title: 'Some Errors Occurred',
          description: `Check console for details. ${result.errors.length} reminders failed.`,
          variant: 'destructive',
        })
      }

      onComplete()
      onOpenChange(false)
    } catch (error) {
      console.error('Error sending reminders:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to send reminders',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-red-600" />
            Send Urgent RSVP Reminders
          </DialogTitle>
          <DialogDescription>
            Send high-priority reminder emails to all guests who haven't RSVP'd yet
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Warning Banner */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-900 mb-2">⚠️ Urgent Reminder Notice</h4>
                <ul className="text-sm text-red-800 space-y-1">
                  <li>• Emails will be marked as <strong>HIGH PRIORITY/IMPORTANCE</strong></li>
                  <li>• Uses urgent language requesting response within 48 hours</li>
                  <li>• Red warning banners and urgent styling throughout</li>
                  <li>• Sent from <strong>rsvp@brendabagsherdiamond.com</strong></li>
                  <li>• Only sent to guests with <strong>pending RSVPs</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Event Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Events</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={loadingEvents}
              >
                {selectedEventIds.length === events.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            {loadingEvents ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading events...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No events found</p>
              </div>
            ) : (
              <div className="space-y-2 border rounded-lg p-4 bg-gray-50">
                {events.map(event => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 bg-white rounded-lg border hover:border-gold-300 transition-colors"
                  >
                    <Checkbox
                      checked={selectedEventIds.includes(event.id)}
                      onCheckedChange={() => handleToggleEvent(event.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{event.name}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(event.starts_at).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Summary */}
          {selectedEventIds.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-900">
                <strong>Ready to send:</strong> Urgent RSVP reminders will be sent to all guests with pending RSVPs for {selectedEventIds.length} event(s)
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={loading || loadingEvents || selectedEventIds.length === 0}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending Reminders...
              </>
            ) : (
              <>
                <Bell className="h-4 w-4 mr-2" />
                Send Urgent Reminders
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

