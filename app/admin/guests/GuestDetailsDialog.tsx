"use client"
import { useState, useEffect } from 'react'
import { Guest } from '@/lib/types/guests'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createInvitationForGuest } from '@/lib/guests-client'
import { bumpNamespaceVersion } from '@/lib/cache-client'
import type { ConfigValue } from '@/lib/types/config'

interface GuestDetailsDialogProps {
  open: boolean
  guest?: Guest
  config?: ConfigValue
  onOpenChange: (open: boolean) => void
  onInvitationCreated?: () => void
}

interface Event {
  id: string
  name: string
  starts_at: string
  venue: string
}

export default function GuestDetailsDialog({ open, guest, config, onOpenChange, onInvitationCreated }: GuestDetailsDialogProps) {
  const [creatingInvitation, setCreatingInvitation] = useState(false)
  const [showEventSelection, setShowEventSelection] = useState(false)
  const [availableEvents, setAvailableEvents] = useState<Event[]>([])
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [loadingEvents, setLoadingEvents] = useState(false)
  const { toast } = useToast()

  // Load events when dialog opens
  useEffect(() => {
    if (open) {
      loadEvents()
    }
  }, [open])

  if (!guest) return null

  // Check if guest has invitations to all available events
  const hasInvitationsToAllEvents = availableEvents.length === 0

  const loadEvents = async () => {
    setLoadingEvents(true)
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      
      if (data.success && data.events) {
        // Filter events to only show those the guest doesn't have invitations to
        const invitedEventIds = new Set<string>()
        guest?.invitations?.forEach(invitation => {
          invitation.invitation_events?.forEach(invitationEvent => {
            invitedEventIds.add(invitationEvent.event_id)
          })
        })
        
        const availableEvents = data.events.filter((event: Event) => 
          !invitedEventIds.has(event.id)
        )
        
        setAvailableEvents(availableEvents)
      } else {
        console.error('Failed to load events:', data.error || 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to load events. Please try again.",
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

  const handleCreateInvitation = () => {
    if (!guest) return
    
    if (availableEvents.length === 0) {
      toast({
        title: "All Events Invited",
        description: `${guest.first_name} ${guest.last_name} already has invitations to all available events.`,
        variant: "destructive",
      })
      return
    }
    
    setShowEventSelection(true)
    setSelectedEvents([])
  }

  const handleEventToggle = (eventId: string) => {
    setSelectedEvents(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
  }

  const handleConfirmInvitationCreation = async () => {
    if (!guest || selectedEvents.length === 0) return
    
    setCreatingInvitation(true)
    try {
      for (const eventId of selectedEvents) {
        await createInvitationForGuest(guest.id, eventId)
      }
      
      // Invalidate cache to refresh guest data
      await bumpNamespaceVersion()
      
      toast({
        title: "Invitations Created",
        description: `Created ${selectedEvents.length} invitation(s) successfully.`,
      })
      
      setShowEventSelection(false)
      setSelectedEvents([])
      
      if (onInvitationCreated) {
        onInvitationCreated()
      }
    } catch (error) {
      console.error('Error creating invitations:', error)
      toast({
        title: "Error",
        description: "Failed to create invitations. Please try again.",
        variant: "destructive",
      })
    } finally {
      setCreatingInvitation(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-serif text-xl">{guest.first_name} {guest.last_name}</span>
            {guest.is_vip && <Badge className="bg-gold-600 text-white">VIP</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium mb-2">Contact</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-black/60">Email</div>
                <div>{guest.email}</div>
              </div>
              <div>
                <div className="text-black/60">Phone</div>
                <div>{guest.phone || '-'}</div>
              </div>
              <div>
                <div className="text-black/60">Household</div>
                <div>{guest.household?.name || '-'}</div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">RSVP</h3>
            <div className="text-sm">
              {guest.latest_rsvp ? (
                <div className="flex items-center gap-2">
                  <div>{guest.latest_rsvp.status}</div>
                  <div className="text-black/60">{(guest as any).latest_rsvp?.party_size ? `(${(guest as any).latest_rsvp.party_size})` : ''}</div>
                </div>
              ) : (
                <div className="text-black/60">No RSVP yet</div>
              )}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Invitations & Events</h3>
              <Button
                onClick={handleCreateInvitation}
                disabled={creatingInvitation || hasInvitationsToAllEvents}
                size="sm"
                variant="outline"
              >
                {creatingInvitation ? 'Creating...' : 
                 hasInvitationsToAllEvents ? 'All Events Invited' : 'Create Invitation'}
              </Button>
            </div>
            <div className="space-y-3">
              {guest.invitations?.length ? guest.invitations.map((inv: any) => (
                <div key={inv.id} className="rounded-md border p-3">
                  <div className="text-xs text-black/60 mb-2">Token: {inv.token}</div>
                  <div className="space-y-2">
                    {(inv.invitation_events || []).map((ie: any) => (
                      <div key={ie.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{ie.event?.name || 'Event'}</div>
                          <div className="text-black/60">
                            Headcount: {config?.plus_ones_enabled ? (ie.headcount ?? '-') : 1}
                            {!config?.plus_ones_enabled && (
                              <span className="text-xs text-gray-500 ml-1">(Fixed - Plus-ones disabled)</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Badge variant="outline" className="border-gold-200 text-gold-700">{ie.status || 'pending'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-sm text-black/60">No invitations</div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>

      {/* Event Selection Dialog */}
      <Dialog open={showEventSelection} onOpenChange={setShowEventSelection}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Events for Invitation</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Choose which events to invite {guest?.first_name} {guest?.last_name} to:
            </p>
            
            {loadingEvents ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500">Loading events...</div>
              </div>
            ) : availableEvents.length === 0 ? (
              <div className="text-center py-4">
                <div className="text-sm text-gray-500">
                  {guest?.first_name} {guest?.last_name} already has invitations to all available events.
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {availableEvents.map((event) => (
                  <div key={event.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`event-${event.id}`}
                      checked={selectedEvents.includes(event.id)}
                      onCheckedChange={() => handleEventToggle(event.id)}
                    />
                    <Label 
                      htmlFor={`event-${event.id}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      <div className="font-medium">{event.name}</div>
                      <div className="text-xs text-gray-500">{event.venue}</div>
                    </Label>
                  </div>
                ))}
              </div>
            )}
            
            {selectedEvents.length > 0 && (
              <div className="text-sm text-gray-600">
                {selectedEvents.length} event(s) selected
              </div>
            )}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEventSelection(false)}
              disabled={creatingInvitation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmInvitationCreation}
              disabled={selectedEvents.length === 0 || creatingInvitation}
            >
              {creatingInvitation ? 'Creating...' : `Create ${selectedEvents.length} Invitation(s)`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}


