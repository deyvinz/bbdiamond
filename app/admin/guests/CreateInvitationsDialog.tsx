'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { Guest } from '@/lib/types/guests'
import { createInvitationsAction } from '@/lib/actions/invitations'
import { sendInviteEmailAction } from '@/lib/actions/invitations'
import { CheckCircle2, Mail, Phone, User } from 'lucide-react'

interface CreateInvitationsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedGuests: Guest[]
  events: Array<{ id: string; name: string; starts_at: string; venue?: string }>
}

type Step = 'select_events' | 'preview' | 'creating'

export function CreateInvitationsDialog({
  open,
  onOpenChange,
  selectedGuests,
  events,
}: CreateInvitationsDialogProps) {
  const [currentStep, setCurrentStep] = useState<Step>('select_events')
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [sendNotifications, setSendNotifications] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleEventToggle = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId)
        ? prev.filter((id) => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleNext = () => {
    if (currentStep === 'select_events') {
      if (selectedEventIds.length === 0) {
        toast({
          title: 'Error',
          description: 'Please select at least one event',
          variant: 'destructive',
        })
        return
      }
      setCurrentStep('preview')
    }
  }

  const handleBack = () => {
    if (currentStep === 'preview') {
      setCurrentStep('select_events')
    }
  }

  const handleCreate = async () => {
    if (selectedEventIds.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one event',
        variant: 'destructive',
      })
      return
    }

    setIsCreating(true)
    setCurrentStep('creating')
    setProgress(0)

    try {
      const guestIds = selectedGuests.map((g) => g.id)
      const eventDefs = selectedEventIds.map((eventId) => ({
        event_id: eventId,
        headcount: 1,
        status: 'pending' as const,
      }))

      // Step 1: Create invitations
      setProgress(25)
      const createResult = await createInvitationsAction({
        guest_ids: guestIds,
        events: eventDefs,
      })

      if (!createResult.success) {
        throw new Error('Failed to create invitations')
      }

      setProgress(50)

      // Get the counts from the result
      const createdCount = createResult.created ?? 0
      const skippedCount = createResult.skipped ?? 0

      // Step 2: Send notifications if requested (only for newly created invitations)
      if (sendNotifications && createResult.invitations && createResult.invitations.length > 0) {
        let successCount = 0
        let errorCount = 0
        const total = createResult.invitations.length

        for (let i = 0; i < createResult.invitations.length; i++) {
          const invitation = createResult.invitations[i]
          const guest = selectedGuests.find((g) => g.id === invitation.guest_id)

          if (!guest) {
            errorCount++
            continue
          }

          // Skip sending notifications for guests that were skipped (already had invitations)
          if (createResult.skippedGuestIds?.includes(invitation.guest_id)) {
            continue
          }

          try {
            // Use notification service which determines best channel
            await sendInviteEmailAction({
              invitationId: invitation.id,
              eventIds: selectedEventIds,
              includeQr: true,
              ignoreRateLimit: true,
            })
            successCount++
          } catch (error) {
            console.error(`Failed to send notification for guest ${guest.first_name}:`, error)
            errorCount++
          }

          // Update progress
          setProgress(50 + (i + 1) / total * 50)
        }

        // Build the toast message based on created and skipped counts
        const skippedMessage = skippedCount > 0 ? ` (${skippedCount} guest${skippedCount !== 1 ? 's' : ''} already had invitations)` : ''

        if (errorCount > 0) {
          toast({
            title: 'Partially Complete',
            description: `Created ${createdCount} invitation${createdCount !== 1 ? 's' : ''}. ${successCount} notification${successCount !== 1 ? 's' : ''} sent, ${errorCount} failed.${skippedMessage}`,
            variant: 'default',
          })
        } else {
          toast({
            title: 'Success',
            description: `Created ${createdCount} invitation${createdCount !== 1 ? 's' : ''} and sent ${successCount} notification${successCount !== 1 ? 's' : ''}.${skippedMessage}`,
          })
        }
      } else {
        const skippedMessage = skippedCount > 0 ? ` (${skippedCount} already had invitations)` : ''
        toast({
          title: 'Success',
          description: `Created ${createdCount} invitation${createdCount !== 1 ? 's' : ''}.${skippedMessage}`,
        })
      }

      setProgress(100)
      
      // Close dialog after a brief delay
      setTimeout(() => {
        onOpenChange(false)
        // Reset state
        setCurrentStep('select_events')
        setSelectedEventIds([])
        setSendNotifications(true)
        setIsCreating(false)
        setProgress(0)
      }, 1000)
    } catch (error) {
      console.error('Error creating invitations:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create invitations',
        variant: 'destructive',
      })
      setIsCreating(false)
    }
  }

  const handleCancel = () => {
    if (isCreating) return // Prevent closing during creation
    
    onOpenChange(false)
    // Reset state
    setCurrentStep('select_events')
    setSelectedEventIds([])
    setSendNotifications(true)
    setIsCreating(false)
    setProgress(0)
  }

  const selectedEvents = events.filter((e) => selectedEventIds.includes(e.id))

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'select_events' && 'Create Invitations'}
            {currentStep === 'preview' && 'Review & Confirm'}
            {currentStep === 'creating' && 'Creating Invitations...'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'select_events' &&
              `Select events for ${selectedGuests.length} guest${selectedGuests.length !== 1 ? 's' : ''}`}
            {currentStep === 'preview' &&
              'Review the details before creating invitations'}
            {currentStep === 'creating' && 'Please wait while we create invitations...'}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 py-4">
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'select_events'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-primary/20 text-primary'
              }`}
            >
              {currentStep !== 'select_events' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">1</span>
              )}
            </div>
            <span className="text-sm font-medium">Select Events</span>
          </div>
          <div className="w-12 h-0.5 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'preview'
                  ? 'bg-primary text-primary-foreground'
                  : currentStep === 'creating'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {currentStep === 'creating' ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">2</span>
              )}
            </div>
            <span className="text-sm font-medium">Preview</span>
          </div>
          <div className="w-12 h-0.5 bg-border" />
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep === 'creating'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              <span className="text-sm font-medium">3</span>
            </div>
            <span className="text-sm font-medium">Confirm</span>
          </div>
        </div>

        {/* Step 1: Select Events */}
        {currentStep === 'select_events' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Events</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4">
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No events available. Please create events first.
                  </p>
                ) : (
                  events.map((event) => (
                    <div
                      key={event.id}
                      className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleEventToggle(event.id)}
                    >
                      <Checkbox
                        checked={selectedEventIds.includes(event.id)}
                        onCheckedChange={(checked) => {
                          // Prevent parent click from also firing
                          handleEventToggle(event.id)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        id={`event-${event.id}`}
                      />
                      <Label
                        htmlFor={`event-${event.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="font-medium">{event.name}</div>
                        {event.venue && (
                          <div className="text-sm text-muted-foreground">
                            {event.venue}
                          </div>
                        )}
                        {event.starts_at && (
                          <div className="text-xs text-muted-foreground">
                            {new Date(event.starts_at).toLocaleDateString()}
                          </div>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {currentStep === 'preview' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Selected Events</Label>
              <div className="space-y-2">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="p-3 border rounded-lg bg-muted/30"
                  >
                    <div className="font-medium">{event.name}</div>
                    {event.venue && (
                      <div className="text-sm text-muted-foreground">
                        {event.venue}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Guests ({selectedGuests.length})</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-4">
                {selectedGuests.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {guest.first_name} {guest.last_name || ''}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {guest.email && (
                          <Badge variant="outline" className="text-xs">
                            <Mail className="h-3 w-3 mr-1" />
                            {guest.email}
                          </Badge>
                        )}
                        {guest.phone && (
                          <Badge variant="outline" className="text-xs">
                            <Phone className="h-3 w-3 mr-1" />
                            {guest.phone}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 border rounded-lg bg-muted/30">
              <Checkbox
                id="send-notifications"
                checked={sendNotifications}
                onCheckedChange={(checked) =>
                  setSendNotifications(checked === true)
                }
              />
              <Label
                htmlFor="send-notifications"
                className="flex-1 cursor-pointer"
              >
                <div className="font-medium">Send notifications after creation</div>
                <div className="text-sm text-muted-foreground">
                  Notifications will be sent using the best available channel (Email, WhatsApp, or SMS) based on guest contact information
                </div>
              </Label>
            </div>
          </div>
        )}

        {/* Step 3: Creating */}
        {currentStep === 'creating' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Creating invitations...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
            <div className="text-sm text-muted-foreground text-center py-4">
              {progress < 50
                ? 'Creating invitation records...'
                : 'Sending notifications...'}
            </div>
          </div>
        )}

        <DialogFooter>
          {currentStep === 'select_events' && (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button onClick={handleNext} disabled={selectedEventIds.length === 0}>
                Next
              </Button>
            </>
          )}
          {currentStep === 'preview' && (
            <>
              <Button variant="outline" onClick={handleBack} disabled={isCreating}>
                Back
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                Create Invitations
              </Button>
            </>
          )}
          {currentStep === 'creating' && (
            <Button variant="outline" disabled>
              Creating...
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

