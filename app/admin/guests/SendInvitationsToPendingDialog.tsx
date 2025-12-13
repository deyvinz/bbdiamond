'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Loader2, AlertCircle } from 'lucide-react'
import { sendInvitationsToAllGuestsAction } from '@/lib/actions/invitations'

interface SendInvitationsToPendingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete?: () => void
}

export function SendInvitationsToPendingDialog({
  open,
  onOpenChange,
  onComplete,
}: SendInvitationsToPendingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [eventCount, setEventCount] = useState<number | null>(null)
  const { toast } = useToast()

  // Fetch event count when dialog opens
  useEffect(() => {
    if (open && eventCount === null) {
      handleFetchEvents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const handleFetchEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      
      if (data.success && data.events) {
        setEventCount(data.events.length)
      } else {
        setEventCount(0)
      }
    } catch (error) {
      setEventCount(0)
    }
  }

  const handleSend = async () => {
    setLoading(true)
    try {
      const result = await sendInvitationsToAllGuestsAction()
      
      if (result.success) {
        toast({
          title: result.sent && result.sent > 0 
            ? '✅ Invitations Sent Successfully!' 
            : 'Complete',
          description: result.message || `Processed ${result.processed || 0} guests.`,
        })
        
        // Show errors if any
        if (result.errors && result.errors.length > 0) {
          console.error('Bulk invite errors:', result.errors)
          toast({
            title: 'Some Errors Occurred',
            description: `Check console for details. ${result.errors.length} guest${result.errors.length !== 1 ? 's' : ''} had errors.`,
            variant: 'destructive',
          })
        }
        
        onOpenChange(false)
        // Reset event count for next time
        setEventCount(null)
        
        // Call onComplete callback if provided
        if (onComplete) {
          onComplete()
        }
      } else {
        toast({
          title: 'Error',
          description: result.message || 'Failed to send invitations',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error sending invitations:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
    // Reset event count when closing
    setEventCount(null)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-gold-600" />
            Send Invites to All Guests
          </DialogTitle>
          <DialogDescription>
            Send invitation notifications to all guests in the database
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Info Banner */}
          <div className="bg-gold-50 border-2 border-gold-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-gold-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-gold-900">
                <h4 className="font-semibold mb-2">What will happen:</h4>
                <ul className="space-y-1 text-gold-800">
                  <li>• Invitations will be sent to <strong>ALL guests</strong> in the database</li>
                  {eventCount !== null && (
                    <li>• For <strong>{eventCount} event{eventCount !== 1 ? 's' : ''}</strong></li>
                  )}
                  <li>• Guests who have already RSVP'd (accepted/declined) will be <strong>skipped</strong></li>
                  <li>• Guests without invitations will have them <strong>created automatically</strong></li>
                  <li>• Notifications will use your configured channels (email, SMS, or WhatsApp)</li>
                </ul>
              </div>
            </div>
          </div>

          {eventCount === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading event information...</span>
            </div>
          ) : eventCount === 0 ? (
            <div className="text-sm text-muted-foreground">
              <p>No events found. Please create events first before sending invitations.</p>
            </div>
          ) : (
            <p className="text-sm text-gray-600">
              This action will process all guests and send invitation notifications using your configured notification channels. 
              Guests who have already responded will be automatically skipped.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            disabled={loading || eventCount === null || eventCount === 0}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                Send Invites to All
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

