'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Plus, Upload, ArrowLeft, Bell } from 'lucide-react'
import InvitationsTable from './InvitationsTable'
import InvitationForm from './InvitationForm'
import SendEmailDialog from './SendEmailDialog'
import ImportCsvDialog from './ImportCsvDialog'
import ViewInvitationDialog from './ViewInvitationDialog'
import SendRsvpRemindersDialog from './SendRsvpRemindersDialog'
import ExportDialog from './ExportDialog'
import {
  createInvitationsAction,
  updateInvitationAction,
  deleteInvitationsAction,
  regenerateInviteTokenAction,
  regenerateEventTokenAction,
  sendInviteEmailAction,
  importInvitationsAction,
  resendRsvpConfirmationAction,
} from '@/lib/actions/invitations'
import { sendRsvpReminderAction } from '@/lib/actions/rsvp-reminders'
import type { Invitation, InvitationEvent } from '@/lib/invitations-service'
import type { ConfigValue } from '@/lib/types/config'

interface InvitationsClientProps {
  initialInvitations: Invitation[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  config?: ConfigValue
  events: any[]
  initialFilters: {
    q?: string
    eventId?: string
    status?: string
    dateFrom?: string
    dateTo?: string
    sort?: {
      column: string
      direction: 'asc' | 'desc'
    }
  }
}

export default function InvitationsClient({
  initialInvitations,
  totalCount,
  page,
  pageSize,
  totalPages,
  config,
  events,
  initialFilters,
}: InvitationsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [invitations, setInvitations] = useState(initialInvitations)
  const [loading, setLoading] = useState(false)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [showInvitationForm, setShowInvitationForm] = useState(false)
  const [showSendEmailDialog, setShowSendEmailDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [showViewDialog, setShowViewDialog] = useState(false)
  const [showRsvpRemindersDialog, setShowRsvpRemindersDialog] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [editingInvitation, setEditingInvitation] = useState<Invitation | undefined>()
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | undefined>()
  const [viewingInvitation, setViewingInvitation] = useState<Invitation | undefined>()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Sync local state with props when they change (e.g., when filtering)
  useEffect(() => {
    setInvitations(initialInvitations)
  }, [initialInvitations, page])

  // Always reset loading states when props update (server data is ready)
  useEffect(() => {
    setLoading(false)
    setIsRefreshing(false)
  }, [initialInvitations, page])

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      // Add a small delay to ensure cache invalidation has completed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use router.refresh() to trigger a full server-side refresh
      router.refresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePageChange = async (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/admin/invitations?${params.toString()}`)
  }

  const handleFiltersChange = async (filters: any) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1') // Reset to first page
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        if (key === 'sort' && typeof value === 'object' && value !== null) {
          // Handle sort object specially
          const sortObj = value as { column: string; direction: string }
          params.set('sort', sortObj.column)
          params.set('direction', sortObj.direction)
        } else {
          params.set(key, value.toString())
        }
      } else {
        params.delete(key)
        if (key === 'sort') {
          params.delete('direction')
        }
      }
    })
    
    // Navigate to new URL - this will trigger a server-side re-render with new data
    router.push(`/admin/invitations?${params.toString()}`)
  }

  const handleClearFilters = () => {
    // Clear all filter parameters from URL, keeping only page=1
    router.push('/admin/invitations?page=1')
  }

  const handleCreateInvitation = () => {
    setEditingInvitation(undefined)
    setShowInvitationForm(true)
  }

  const handleEditInvitation = (invitation: Invitation) => {
    setEditingInvitation(invitation)
    setShowInvitationForm(true)
  }

  const handleSaveInvitation = async (data: {
    guest_ids: string[]
    events: Array<{
      event_id: string
      headcount: number
      status: 'pending' | 'accepted' | 'declined' | 'waitlist'
    }>
  }) => {
    try {
      setLoading(true)
      if (editingInvitation) {
        // Update existing invitation
        await updateInvitationAction(editingInvitation.id, {
          guest_id: data.guest_ids[0], // For now, only support single guest updates
          events: data.events
        })
        toast({
          title: "Success",
          description: "Invitation updated successfully",
        })
      } else {
        // Create new invitations
        await createInvitationsAction(data)
        toast({
          title: "Success",
          description: `Created invitations for ${data.guest_ids.length} guests`,
        })
      }
      
      setShowInvitationForm(false)
      await refreshData()
    } catch (error) {
      console.error('Error saving invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save invitation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      setLoading(true)
      await deleteInvitationsAction([invitationId])
      toast({
        title: "Success",
        description: "Invitation deleted successfully",
      })
      // Add a small delay to ensure server processing is complete
      setTimeout(async () => {
        await refreshData()
      }, 500)
    } catch (error) {
      console.error('Error deleting invitation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete invitation",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerateInviteToken = async (invitationId: string) => {
    try {
      await regenerateInviteTokenAction(invitationId)
      toast({
        title: "Success",
        description: "Invite token regenerated successfully",
      })
      await refreshData()
    } catch (error) {
      console.error('Error regenerating invite token:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate token",
        variant: "destructive",
      })
    }
  }

  const handleRegenerateEventToken = async (invitationEventId: string) => {
    try {
      await regenerateEventTokenAction(invitationEventId)
      toast({
        title: "Success",
        description: "Event token regenerated successfully",
      })
      await refreshData()
    } catch (error) {
      console.error('Error regenerating event token:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to regenerate token",
        variant: "destructive",
      })
    }
  }

  const handleSendEmail = (invitationId: string) => {
    const invitation = invitations.find(inv => inv.id === invitationId)
    if (invitation) {
      setSelectedInvitation(invitation)
      setShowSendEmailDialog(true)
    }
  }

  const handleSendEmailConfirm = async (data: {
    invitationId: string
    eventIds: string[]
    to?: string
    includeQr?: boolean
  }) => {
    setSendingEmail(true)
    try {
      const result = await sendInviteEmailAction({
        ...data,
        includeQr: data.includeQr ?? true,
        ignoreRateLimit: true,
        to: data.to || undefined,
      })
      
      toast({
        title: "Success",
        description: result.message || "Invitation notification sent successfully",
      })
      setShowSendEmailDialog(false)
      await refreshData()
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send notification",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
    }
  }

  const handleResendRsvpConfirmation = async (invitationId: string) => {
    try {
      await resendRsvpConfirmationAction(invitationId)
      
      toast({
        title: "Success",
        description: "RSVP confirmation with QR code and digital pass sent successfully",
      })
      
      // Refresh data to show updated state
      await refreshData()
    } catch (error) {
      console.error('Error resending RSVP confirmation:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to resend RSVP confirmation",
        variant: "destructive",
      })
    }
  }

  const handleViewInvitation = (invitation: Invitation) => {
    setViewingInvitation(invitation)
    setShowViewDialog(true)
  }

  const exportInvitationsToCsv = (invitations: Invitation[]) => {
    const csvData = invitations.flatMap(invitation => 
      invitation.invitation_events.map(event => ({
        guest_email: invitation.guest.email,
        guest_first_name: invitation.guest.first_name,
        guest_last_name: invitation.guest.last_name,
        guest_invite_code: invitation.guest.invite_code,
        invitation_id: invitation.id,
        event_id: event.event_id,
        event_name: event.event.name,
        status: event.status,
        headcount: event.headcount,
        invite_token: invitation.token,
        event_token: event.event_token,
        created_at: invitation.created_at,
      }))
    )

    // Convert to CSV
    const headers = [
      'guest_email',
      'guest_first_name', 
      'guest_last_name',
      'guest_invite_code',
      'invitation_id',
      'event_id',
      'event_name',
      'status',
      'headcount',
      'invite_token',
      'event_token',
      'created_at'
    ]

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => 
        headers.map(header => {
          const value = row[header as keyof typeof row]
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(',')
      )
    ].join('\n')

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `invitations-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    setShowExportDialog(true)
  }

  const handleBulkAction = async (action: string, invitationIds: string[]) => {
    setLoading(true)
    try {
      switch (action) {
        case 'send_rsvp_reminder':
          // Send RSVP reminders for all selected invitations
          let successCount = 0
          let skippedCount = 0
          let errorCount = 0
          
          for (const invitationId of invitationIds) {
            const invitation = invitations.find(inv => inv.id === invitationId)
            if (!invitation) {
              errorCount++
              continue
            }
            
            // Check if any events are pending
            const hasPendingEvents = invitation.invitation_events.some(
              event => event.status === 'pending'
            )
            
            if (!hasPendingEvents) {
              skippedCount++
              continue
            }
            
            try {
              await sendRsvpReminderAction({
                invitationId,
                to: invitation.guest.email
              })
              successCount++
            } catch (error) {
              console.error(`Failed to send reminder for invitation ${invitationId}:`, error)
              errorCount++
            }
          }
          
          toast({
            title: successCount > 0 ? "RSVP Reminders Sent" : "No Reminders Sent",
            description: `${successCount} sent, ${skippedCount} skipped (already RSVP'd)${errorCount > 0 ? `, ${errorCount} errors` : ''}`,
            variant: successCount > 0 ? "default" : "destructive",
          })
          break
        case 'regenerate_tokens':
          // Regenerate tokens for all selected invitations
          for (const invitationId of invitationIds) {
            await regenerateInviteTokenAction(invitationId)
          }
          toast({
            title: "Success",
            description: `Tokens regenerated for ${invitationIds.length} invitations`,
          })
          break
        case 'export':
          // Export selected invitations
          const selectedInvitations = invitations.filter(inv => invitationIds.includes(inv.id))
          exportInvitationsToCsv(selectedInvitations)
          toast({
            title: "Success",
            description: "Selected invitations exported to CSV",
          })
          break
        case 'delete':
          // Delete selected invitations
          await deleteInvitationsAction(invitationIds)
          toast({
            title: "Success",
            description: `Deleted ${invitationIds.length} invitations`,
          })
          break
      }
      await refreshData()
    } catch (error) {
      console.error('Error performing bulk action:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to perform action",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (data: any[]) => {
    try {
      const result = await importInvitationsAction(data)
      toast({
        title: "Import completed",
        description: `${result.success} invitations imported, ${result.errors.length} errors`,
        variant: result.errors.length > 0 ? "destructive" : "default",
      })
      setShowImportDialog(false)
      await refreshData()
      return result
    } catch (error) {
      console.error('Error importing invitations:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to import invitations",
        variant: "destructive",
      })
      throw error
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Title and subtitle row with Back button */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif">Invitations Management</h1>
            <p className="text-gray-600 mt-1">
              Manage wedding invitations and RSVPs
            </p>
          </div>
        </div>

        {/* Buttons row */}
        <div className="flex flex-wrap items-center gap-2">
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin h-4 w-4 border-2 border-gold-600 border-t-transparent rounded-full"></div>
              <span className="hidden sm:inline">Refreshing...</span>
            </div>
          )}
          <Button
            onClick={() => setShowRsvpRemindersDialog(true)}
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            <Bell className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Send RSVP Reminders</span>
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
            onClick={handleCreateInvitation}
            className="bg-gold-600 text-white hover:bg-gold-700 flex-1 sm:flex-none"
            size="sm"
          >
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Create Invitation</span>
          </Button>
        </div>

        {/* Table */}
        <InvitationsTable
        invitations={invitations}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        events={events}
        initialFilters={initialFilters}
        onPageChange={handlePageChange}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        onEdit={handleEditInvitation}
        onDelete={handleDeleteInvitation}
        onRegenerateInviteToken={handleRegenerateInviteToken}
        onRegenerateEventToken={handleRegenerateEventToken}
        onResendRsvpConfirmation={handleResendRsvpConfirmation}
        onView={handleViewInvitation}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        loading={loading && initialInvitations.length === 0}
      />
      </div>

      {/* Dialogs */}
      <InvitationForm
        open={showInvitationForm}
        onOpenChange={setShowInvitationForm}
        invitation={editingInvitation}
        config={config}
        onSave={handleSaveInvitation}
        loading={loading}
      />

      <SendEmailDialog
        open={showSendEmailDialog}
        onOpenChange={setShowSendEmailDialog}
        invitation={selectedInvitation}
        config={config}
        onSend={handleSendEmailConfirm}
        loading={sendingEmail}
      />

      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        config={config}
        onImport={handleImport}
        loading={loading}
      />

      <ViewInvitationDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        invitation={viewingInvitation}
        config={config}
      />

      <SendRsvpRemindersDialog
        open={showRsvpRemindersDialog}
        onOpenChange={setShowRsvpRemindersDialog}
        onComplete={refreshData}
      />

      <ExportDialog
        open={showExportDialog}
        onOpenChange={setShowExportDialog}
        events={events}
      />
    </>
  )
}
