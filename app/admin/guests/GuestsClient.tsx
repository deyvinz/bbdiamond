'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Guest, GuestFilters } from '@/lib/types/guests'
import type { ConfigValue } from '@/lib/types/config'
import GuestTable from './GuestTable'
import GuestForm from './GuestForm'
import ImportCsvDialog from './ImportCsvDialog'
import GuestDetailsDialog from './GuestDetailsDialog'
import { BackfillInviteCodesDialog } from './BackfillInviteCodesDialog'
import CleanupDuplicatesDialog from './CleanupDuplicatesDialog'
import CleanupHouseholdsDialog from './CleanupHouseholdsDialog'
import ExportDialog from './ExportDialog'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Upload, RefreshCw, Settings, Trash2 } from 'lucide-react'
import {
  createGuest, 
  updateGuest, 
  deleteGuest
} from '@/lib/guests-service'
import {
  regenerateInvitationToken,
  exportGuestsToCsv,
  createInvitationForGuest,
  sendInvitesToAllGuests
} from '@/lib/guests-client'
import { sendInviteEmailAction } from '@/lib/actions/invitations'
import { CreateInvitationsDialog } from './CreateInvitationsDialog'

interface GuestsClientProps {
  initialGuests: Guest[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  config?: ConfigValue | null
  events: any[]
  initialFilters: GuestFilters
}

export default function GuestsClient({
  initialGuests,
  totalCount,
  page,
  pageSize,
  totalPages,
  config,
  events,
  initialFilters
}: GuestsClientProps) {
  const [guests, setGuests] = useState(initialGuests)
  const [totalCountState, setTotalCountState] = useState(totalCount)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showBackfillDialog, setShowBackfillDialog] = useState(false)
  const [showCleanupDialog, setShowCleanupDialog] = useState(false)
  const [showCleanupHouseholdsDialog, setShowCleanupHouseholdsDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showCreateInvitationsDialog, setShowCreateInvitationsDialog] = useState(false)
  const [selectedGuestsForInvitations, setSelectedGuestsForInvitations] = useState<Guest[]>([])
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>()
  const [viewGuest, setViewGuest] = useState<Guest | undefined>()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Update local state when props change (after refresh)
  // Always reset loading states when props update (data arrives from server)
  useEffect(() => {
    setGuests(initialGuests)
    setTotalCountState(totalCount)
    // Immediately reset loading when props update - server data is ready
    setLoading(false)
    setRefreshing(false)
  }, [initialGuests, totalCount, page])

  const handlePageChange = async (newPage: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('page', newPage.toString())
    router.push(url.toString())
  }

  const handleFiltersChange = async (newFilters: GuestFilters) => {
    const url = new URL(window.location.href)
    
    // Map client-side filter keys to server-side parameter names
    const paramMapping: Record<string, string> = {
      search: 'search',
      rsvp_status: 'rsvp_status', 
      is_vip: 'is_vip',
      sort_by: 'sort_by',
      sort_order: 'sort_order'
    }
    
    Object.entries(newFilters).forEach(([key, value]) => {
      const paramName = paramMapping[key] || key
      if (value !== undefined && value !== '') {
        url.searchParams.set(paramName, value.toString())
      } else {
        url.searchParams.delete(paramName)
      }
    })
    url.searchParams.delete('page') // Reset to first page
    router.push(url.toString())
  }

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest)
    setShowGuestForm(true)
  }

  const handleView = (guest: Guest) => {
    setViewGuest(guest)
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      // Refresh the page to get latest data from server
      router.refresh()
      
      // Also update local state by refetching data
      const currentUrl = new URL(window.location.href)
      const searchParams = new URLSearchParams(currentUrl.search)
      
      const params = {
        page: parseInt(searchParams.get('page') || '1'),
        pageSize: 20,
        q: searchParams.get('search') || undefined,
        status: searchParams.get('rsvp_status') || undefined,
        vip: searchParams.get('is_vip') === 'true' ? true : searchParams.get('is_vip') === 'false' ? false : undefined,
        sort: {
          column: searchParams.get('sort_by') || 'name',
          direction: (searchParams.get('sort_order') as 'asc' | 'desc') || 'asc'
        }
      }
      
      // Fetch fresh data
      const response = await fetch(`/api/guests?${new URLSearchParams({
        page: params.page.toString(),
        pageSize: params.pageSize.toString(),
        ...(params.q && { q: params.q }),
        ...(params.status && { status: params.status }),
        ...(params.vip !== undefined && { vip: params.vip.toString() }),
        sortColumn: params.sort.column,
        sortDirection: params.sort.direction
      })}`)
      
      if (response.ok) {
        const data = await response.json()
        setGuests(data.guests)
        setTotalCountState(data.total_count)
      }
      
    } catch (error) {
      console.error('Error refreshing data:', error)
      toast({
        title: "Error",
        description: "Failed to refresh data",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  const handleSaveGuest = async (data: { guest: Record<string, any>; invitation?: Record<string, any> }) => {
    setLoading(true)
    try {      
      if (editingGuest) {
        // Update existing guest
        const updatedGuest = await updateGuest(editingGuest.id, data.guest)
        
        // Create invitations if specified (for both new and existing guests)
        if (data.invitation?.event_ids && data.invitation.event_ids.length > 0) {
          try {
            for (const eventId of data.invitation.event_ids) {
              await createInvitationForGuest(updatedGuest.id, eventId)
            }
          } catch (invitationError) {
            console.error('Error creating invitations:', invitationError)
            toast({
              title: "Warning",
              description: "Guest updated but some invitations may not have been created. Please check the guest details.",
              variant: "destructive",
            })
          }
        }
        
        setGuests(prev => prev.map(g => g.id === editingGuest.id ? updatedGuest : g))
        toast({
          title: "✅ Guest Updated Successfully!",
          description: `${updatedGuest.first_name} ${updatedGuest.last_name || ''} has been updated.`,
        })
      } else {
        // Create new guest
        const newGuest = await createGuest(data.guest)       
        // Create invitations if specified
        if (data.invitation?.event_ids && data.invitation.event_ids.length > 0) {
          try {
            for (const eventId of data.invitation.event_ids) {
              await createInvitationForGuest(newGuest.id, eventId)
            }
          } catch (invitationError) {
            console.error('Error creating invitations:', invitationError)
            toast({
              title: "Warning",
              description: "Guest created but some invitations may not have been created. Please check the guest details.",
              variant: "destructive",
            })
          }
        }
        
        setGuests(prev => [newGuest, ...prev])
        setTotalCountState(prev => prev + 1)
        toast({
          title: "🎉 Guest Created Successfully!",
          description: `${newGuest.first_name} ${newGuest.last_name || ''} has been added to your guest list.`,
        })
      }
      setShowGuestForm(false)
      setEditingGuest(undefined)
      // Refresh data to get latest state
      await refreshData()
    } catch (error) {
      console.error('Error in handleSaveGuest:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (guestId: string) => {
    const guestToDelete = guests.find(g => g.id === guestId)
    const guestName = guestToDelete ? `${guestToDelete.first_name} ${guestToDelete.last_name || ''}` : 'this guest'
    
    if (!confirm(`Are you sure you want to delete ${guestName}? This action cannot be undone and will remove all associated invitations.`)) {
      return
    }

    setLoading(true)
    try {
      await deleteGuest(guestId)
      setGuests(prev => prev.filter(g => g.id !== guestId))
      setTotalCountState(prev => Math.max(0, prev - 1))
      toast({
        title: "🗑️ Guest Deleted Successfully!",
        description: `${guestName} and all associated invitations have been removed.`,
      })
      // Refresh data to get latest state
      await refreshData()
    } catch (error) {
      console.error('Error deleting guest:', error)
      toast({
        title: "❌ Failed to Delete Guest",
        description: error instanceof Error ? error.message : "An unexpected error occurred while deleting the guest",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateToken = async (guestId: string, eventId: string) => {
    setLoading(true)
    try {
      // Find the guest and their invitation for this event
      const guest = guests.find(g => g.id === guestId)
      if (!guest?.invitations?.[0]) {
        throw new Error('No invitation found for this guest')
      }
      
      const invitation = guest.invitations[0]
      const invitationEvent = invitation.invitation_events?.find(ie => ie.event_id === eventId)
      
      if (!invitationEvent) {
        throw new Error('No invitation found for this event')
      }
      
      await regenerateInvitationToken(guestId, eventId)
      toast({
        title: "Success",
        description: "Token regenerated successfully",
      })
      // Refresh data to get updated state
      await refreshData()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSendInvite = async (guestId: string, eventId: string) => {
    setLoading(true)
    try {
      // Find the guest and their invitation for this event
      const guest = guests.find(g => g.id === guestId)
      if (!guest) {
        throw new Error('Guest not found')
      }
      
      if (!guest.invitations || guest.invitations.length === 0) {
        throw new Error(`No invitations found for ${guest.first_name} ${guest.last_name || ''}`)
      }
      
      const invitation = guest.invitations[0]
      const invitationEvent = invitation.invitation_events?.find(ie => ie.event_id === eventId)
      
      if (!invitationEvent) {
        throw new Error(`No invitation found for this event for ${guest.first_name} ${guest.last_name || ''}`)
      }
      
      if (!guest.email) {
        throw new Error(`${guest.first_name} ${guest.last_name || ''} does not have an email address`)
      }
      
      await sendInviteEmailAction({
        invitationId: invitation.id,
        eventIds: [eventId],
        includeQr: true,
        ignoreRateLimit: true,
        to: guest.email
      })
      
      toast({
        title: "Success",
        description: `Invitation email sent to ${guest.first_name} ${guest.last_name || ''}`,
      })
      // Refresh data to get updated state
      await refreshData()
    } catch (error) {
      console.error('Error sending invite:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleBulkAction = async (action: string, guestIds: string[]) => {
    setLoading(true)
    try {
      switch (action) {
        case 'send_invite':
          // Send invites for all selected guests using notification service
          // The notification service will determine the best channel (email, WhatsApp, SMS)
          let successCount = 0
          let errorCount = 0
          let skippedCount = 0
          
          for (const guestId of guestIds) {
            try {
              const guest = guests.find(g => g.id === guestId)
              if (!guest) {
                console.error(`Guest not found: ${guestId}`)
                errorCount++
                continue
              }
              
              // Check if guest has invitations
              if (!guest.invitations || guest.invitations.length === 0) {
                console.error(`No invitations found for guest: ${guest.first_name} ${guest.last_name || ''}`)
                errorCount++
                continue
              }
              
              const invitation = guest.invitations[0]
              const eventIds = invitation.invitation_events?.map(ie => ie.event_id) || []
              
              if (eventIds.length === 0) {
                console.error(`No events found for invitation: ${invitation.id}`)
                errorCount++
                continue
              }
              
              // Use notification service which determines best channel (email, WhatsApp, SMS)
              // based on guest contact info and enabled channels
              const result = await sendInviteEmailAction({
                invitationId: invitation.id,
                eventIds,
                includeQr: true,
                ignoreRateLimit: true,
              })
              
              if (result.success) {
                successCount++
              } else {
                // Check if it was skipped (no channel available) vs failed
                if (result.message?.includes('No notification channel') || result.message?.includes('no available contact')) {
                  skippedCount++
                } else {
                  errorCount++
                }
              }
            } catch (error) {
              console.error(`Failed to send invite for guest ${guestId}:`, error)
              errorCount++
            }
          }
          
          if (successCount > 0 || skippedCount > 0) {
            let description = `Notifications sent to ${successCount} guest${successCount !== 1 ? 's' : ''}`
            if (skippedCount > 0) {
              description += `, ${skippedCount} skipped (no contact method)`
            }
            if (errorCount > 0) {
              description += `, ${errorCount} failed`
            }
            toast({
              title: "Complete",
              description,
            })
          } else {
            toast({
              title: "Error",
              description: `Failed to send invitations to all ${guestIds.length} guests`,
              variant: "destructive",
            })
          }
          
          // Refresh data after bulk action
          await refreshData()
          break
        case 'create_invitations':
          // Open create invitations dialog with selected guests
          const guestsToInvite = guests.filter(g => guestIds.includes(g.id))
          setSelectedGuestsForInvitations(guestsToInvite)
          setShowCreateInvitationsDialog(true)
          break
        case 'regenerate_tokens':
          // Regenerate tokens for all selected guests
          for (const guestId of guestIds) {
            const guest = guests.find(g => g.id === guestId)
            if (guest?.invitations?.[0]) {
              const invitation = guest.invitations[0]
              const eventIds = invitation.invitation_events?.map(ie => ie.event_id) || []
              
              for (const eventId of eventIds) {
                await regenerateInvitationToken(guestId, eventId)
              }
            }
          }
          toast({
            title: "Success",
            description: `Tokens regenerated for ${guestIds.length} guests`,
          })
          // Refresh data after bulk action
          await refreshData()
          break
        case 'export':
          // Export selected guests
          const selectedGuests = guests.filter(g => guestIds.includes(g.id))
          exportGuestsToCsv(selectedGuests)
          toast({
            title: "Success",
            description: "Selected guests exported to CSV",
          })
          break
        case 'delete':
          // Delete selected guests
          if (!confirm(`Are you sure you want to delete ${guestIds.length} guests? This action cannot be undone.`)) {
            return
          }
          for (const guestId of guestIds) {
            await deleteGuest(guestId)
          }
          setGuests(prev => prev.filter(g => !guestIds.includes(g.id)))
          setTotalCountState(prev => Math.max(0, prev - guestIds.length))
          toast({
            title: "Success",
            description: `${guestIds.length} guests deleted successfully`,
          })
          // Refresh data after bulk delete
          await refreshData()
          break
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImportComplete = async () => {
    // Refresh the page to get updated data
    await refreshData()
  }

  const handleSendInvitesToAll = async () => {
    // First, we need to get the available events
    try {
      const eventsResponse = await fetch('/api/events')
      const eventsData = await eventsResponse.json()
      
      if (!eventsData.success || !eventsData.events || eventsData.events.length === 0) {
        toast({
          title: "Error",
          description: "No events found. Please create events first.",
          variant: "destructive",
        })
        return
      }

      const eventIds = eventsData.events.map((event: any) => event.id)
      
      // Show confirmation dialog
      const confirmed = confirm(
        `This will send invitation emails to ALL guests in the database for ${eventIds.length} event(s).\n\n` +
        `Guests who have already RSVP'd (accepted/declined) will be skipped.\n` +
        `Guests without invitations will have them created automatically.\n\n` +
        `Are you sure you want to continue?`
      )

      if (!confirmed) {
        return
      }

      setLoading(true)
      
      try {
        const results = await sendInvitesToAllGuests(eventIds)
        
        // Show results
        if (results.sent > 0) {
          toast({
            title: "✅ Bulk Invites Sent Successfully!",
            description: `Processed ${results.processed} guests: ${results.sent} emails sent, ${results.skipped} skipped${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`,
          })
        } else {
          toast({
            title: "No Emails Sent",
            description: `Processed ${results.processed} guests: ${results.skipped} skipped${results.errors.length > 0 ? `, ${results.errors.length} errors` : ''}`,
            variant: "destructive",
          })
        }

        // Show errors if any
        if (results.errors.length > 0) {
          console.error('Bulk invite errors:', results.errors)
          toast({
            title: "Some Errors Occurred",
            description: `Check console for details. ${results.errors.length} guests had errors.`,
            variant: "destructive",
          })
        }

        // Refresh data to get updated state
        await refreshData()

      } catch (error) {
        console.error('Error in bulk invite:', error)
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred during bulk invite",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }

    } catch (error) {
      console.error('Error fetching events:', error)
      toast({
        title: "Error",
        description: "Failed to fetch events. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCreateMissingInvitations = async () => {
    setLoading(true)
    try {
      // Fetch all guests without invitations
      const response = await fetch('/api/guests?without_invitations=true&pageSize=1000')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch guests')
      }

      const guestsWithoutInvitations = data.guests || []
      
      if (guestsWithoutInvitations.length === 0) {
        toast({
          title: "All Done! 🎉",
          description: "All guests already have invitations.",
        })
        return
      }

      // Open the CreateInvitationsDialog with these guests pre-selected
      setSelectedGuestsForInvitations(guestsWithoutInvitations)
      setShowCreateInvitationsDialog(true)
      
      toast({
        title: "Guests Found",
        description: `Found ${guestsWithoutInvitations.length} guest${guestsWithoutInvitations.length !== 1 ? 's' : ''} without invitations.`,
      })
    } catch (error) {
      console.error('Error fetching guests without invitations:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to fetch guests without invitations",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Title and subtitle row */}
        <div>
          <h1 className="text-2xl lg:text-3xl font-serif">Guests Management</h1>
          <p className="text-gray-600 mt-1">
            Manage your wedding guest list, invitations, and RSVPs
          </p>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={refreshData}
              variant="outline"
              disabled={refreshing}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className={`h-4 w-4 sm:mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Upload className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Import CSV</span>
            </Button>
            <Button
              onClick={() => setShowBackfillDialog(true)}
              variant="outline"
              size="sm"
              className="bg-gold-50 border-gold-200 text-gold-700 hover:bg-gold-100 flex-1 sm:flex-none"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Backfill</span>
            </Button>
            <Button
              onClick={() => setShowCleanupDialog(true)}
              variant="outline"
              size="sm"
              className="border-orange-200 text-orange-700 hover:bg-orange-50 flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clean Duplicates</span>
            </Button>
            <Button
              onClick={() => setShowCleanupHouseholdsDialog(true)}
              variant="outline"
              size="sm"
              className="border-purple-200 text-purple-700 hover:bg-purple-50 flex-1 sm:flex-none"
            >
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Clean Households</span>
            </Button>
            <Button
              onClick={() => {
                setEditingGuest(undefined)
                setShowGuestForm(true)
              }}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Guest</span>
            </Button>
        </div>

        <GuestTable
          guests={guests}
          totalCount={totalCountState}
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          initialFilters={initialFilters}
          onPageChange={handlePageChange}
          onFiltersChange={handleFiltersChange}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRegenerateToken={handleRegenerateToken}
          onSendInvite={handleSendInvite}
          onExport={handleExport}
          onBulkAction={handleBulkAction}
          onSendInvitesToAll={handleSendInvitesToAll}
          onCreateMissingInvitations={handleCreateMissingInvitations}
          onView={handleView}
          loading={loading && initialGuests.length === 0}
        />
      </div>

      <GuestForm
        open={showGuestForm}
        onOpenChange={setShowGuestForm}
        guest={editingGuest}
        onSave={handleSaveGuest}
      />

      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImportComplete={handleImportComplete}
      />

      <BackfillInviteCodesDialog
        open={showBackfillDialog}
        onOpenChange={setShowBackfillDialog}
      />

      <CleanupDuplicatesDialog
        open={showCleanupDialog}
        onOpenChange={setShowCleanupDialog}
        onComplete={refreshData}
      />

      <CleanupHouseholdsDialog
        open={showCleanupHouseholdsDialog}
        onOpenChange={setShowCleanupHouseholdsDialog}
        onComplete={refreshData}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        events={events}
      />

      <GuestDetailsDialog
        open={!!viewGuest}
        guest={viewGuest}
        config={config || undefined}
        onOpenChange={(open) => !open && setViewGuest(undefined)}
        onInvitationCreated={() => refreshData()}
      />

      <CreateInvitationsDialog
        open={showCreateInvitationsDialog}
        onOpenChange={(open) => {
          setShowCreateInvitationsDialog(open)
          if (!open) {
            // Refresh data when dialog closes
            refreshData()
          }
        }}
        selectedGuests={selectedGuestsForInvitations}
        events={events}
      />
    </>
  )
}
