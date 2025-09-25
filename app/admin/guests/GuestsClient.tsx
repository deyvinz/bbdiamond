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
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Upload, RefreshCw, Settings } from 'lucide-react'
import {
  createGuest, 
  updateGuest, 
  deleteGuest, 
  createInvitationForGuest
} from '@/lib/guests-service'
import {
  regenerateInvitationToken,
  exportGuestsToCsv
} from '@/lib/guests-client'
import { sendInviteEmailAction } from '@/lib/actions/invitations'

interface GuestsClientProps {
  initialGuests: Guest[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  config?: ConfigValue | null
  initialFilters: GuestFilters
}

export default function GuestsClient({
  initialGuests,
  totalCount,
  page,
  pageSize,
  totalPages,
  config,
  initialFilters
}: GuestsClientProps) {
  const [guests, setGuests] = useState(initialGuests)
  const [totalCountState, setTotalCountState] = useState(totalCount)
  const [showGuestForm, setShowGuestForm] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showBackfillDialog, setShowBackfillDialog] = useState(false)
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>()
  const [viewGuest, setViewGuest] = useState<Guest | undefined>()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isFiltering, setIsFiltering] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  // Update local state when props change (after refresh)
  useEffect(() => {
    setGuests(initialGuests)
    setTotalCountState(totalCount)
  }, [initialGuests, totalCount])

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
        setGuests(prev => prev.map(g => g.id === editingGuest.id ? updatedGuest : g))
        toast({
          title: "✅ Guest Updated Successfully!",
          description: `${updatedGuest.first_name} ${updatedGuest.last_name} has been updated.`,
        })
      } else {
        // Create new guest
        const newGuest = await createGuest(data.guest)       
        // Create invitations if specified
        if (data.invitation?.event_ids && data.invitation.event_ids.length > 0) {
          for (const eventId of data.invitation.event_ids) {
            await createInvitationForGuest(newGuest.id, eventId)
          }
        }
        
        setGuests(prev => [newGuest, ...prev])
        setTotalCountState(prev => prev + 1)
        toast({
          title: "🎉 Guest Created Successfully!",
          description: `${newGuest.first_name} ${newGuest.last_name} has been added to your guest list.`,
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
    const guestName = guestToDelete ? `${guestToDelete.first_name} ${guestToDelete.last_name}` : 'this guest'
    
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
      if (!guest?.invitations?.[0]) {
        throw new Error('No invitation found for this guest')
      }
      
      const invitation = guest.invitations[0]
      const invitationEvent = invitation.invitation_events?.find(ie => ie.event_id === eventId)
      
      if (!invitationEvent) {
        throw new Error('No invitation found for this event')
      }
      
      await sendInviteEmailAction({
        invitationId: invitation.id,
        eventIds: [eventId],
        includeQr: true
      })
      
      toast({
        title: "Success",
        description: "Invitation email sent successfully",
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

  const handleExport = () => {
    try {
      exportGuestsToCsv(guests)
      toast({
        title: "Success",
        description: "Guests exported to CSV",
      })
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to export guests",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: string, guestIds: string[]) => {
    setLoading(true)
    try {
      switch (action) {
        case 'send_invite':
          // Send invites for all selected guests
          for (const guestId of guestIds) {
            const guest = guests.find(g => g.id === guestId)
            if (guest?.invitations?.[0]) {
              const invitation = guest.invitations[0]
              const eventIds = invitation.invitation_events?.map(ie => ie.event_id) || []
              
              if (eventIds.length > 0) {
                await sendInviteEmailAction({
                  invitationId: invitation.id,
                  eventIds,
                  includeQr: true
                })
              }
            }
          }
          toast({
            title: "Success",
            description: `Invitations sent to ${guestIds.length} guests`,
          })
          // Refresh data after bulk action
          await refreshData()
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

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif">Guests Management</h1>
            <p className="text-gray-600 mt-1">
              Manage your wedding guest list, invitations, and RSVPs
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button
              onClick={refreshData}
              variant="outline"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              onClick={() => setShowImportDialog(true)}
              variant="outline"
            >
              <Upload className="h-4 w-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => setShowBackfillDialog(true)}
              variant="outline"
              className="bg-gold-50 border-gold-200 text-gold-700 hover:bg-gold-100"
            >
              <Settings className="h-4 w-4 mr-2" />
              Backfill Invite Codes
            </Button>
            <Button
              onClick={() => {
                setEditingGuest(undefined)
                setShowGuestForm(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Guest
            </Button>
          </div>
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
          onView={handleView}
          loading={loading || refreshing}
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

      <GuestDetailsDialog
        open={!!viewGuest}
        guest={viewGuest}
        config={config || undefined}
        onOpenChange={(open) => !open && setViewGuest(undefined)}
      />
    </>
  )
}
