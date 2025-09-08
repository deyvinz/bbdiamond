'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { Plus, Upload } from 'lucide-react'
import InvitationsTable from './InvitationsTable'
import InvitationForm from './InvitationForm'
import SendEmailDialog from './SendEmailDialog'
import ImportCsvDialog from './ImportCsvDialog'
import ViewInvitationDialog from './ViewInvitationDialog'
import {
  createInvitationsAction,
  updateInvitationAction,
  deleteInvitationsAction,
  regenerateInviteTokenAction,
  regenerateEventTokenAction,
  sendInviteEmailAction,
  importInvitationsAction,
} from '@/lib/actions/invitations'
import type { Invitation, InvitationEvent } from '@/lib/invitations-service'

interface InvitationsClientProps {
  initialInvitations: Invitation[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
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
  const [editingInvitation, setEditingInvitation] = useState<Invitation | undefined>()
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | undefined>()
  const [viewingInvitation, setViewingInvitation] = useState<Invitation | undefined>()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const refreshData = async () => {
    setIsRefreshing(true)
    try {
      // Use router.refresh() to trigger a full server-side refresh
      await router.refresh()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', newPage.toString())
    router.push(`/admin/invitations?${params.toString()}`)
  }

  const handleFiltersChange = (filters: any) => {
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
    
    router.push(`/admin/invitations?${params.toString()}`)
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
    }
  }

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      console.log('Deleting invitation:', invitationId)
      setLoading(true)
      await deleteInvitationsAction([invitationId])
      console.log('Invitation deleted successfully')
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
      await sendInviteEmailAction({
        ...data,
        includeQr: data.includeQr ?? true,
      })
      toast({
        title: "Success",
        description: "Invitation email sent successfully",
      })
      setShowSendEmailDialog(false)
      await refreshData()
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send email",
        variant: "destructive",
      })
    } finally {
      setSendingEmail(false)
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

  const handleExport = async () => {
    try {
      exportInvitationsToCsv(invitations)
      toast({
        title: "Success",
        description: "Invitations exported to CSV",
      })
    } catch (error) {
      console.error('Error exporting invitations:', error)
      toast({
        title: "Error",
        description: "Failed to export invitations",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: string, invitationIds: string[]) => {
    setLoading(true)
    try {
      switch (action) {
        case 'send_email':
          // Send emails for all selected invitations
          for (const invitationId of invitationIds) {
            const invitation = invitations.find(inv => inv.id === invitationId)
            if (invitation?.invitation_events?.[0]) {
              await sendInviteEmailAction({
                invitationId,
                eventIds: invitation.invitation_events.map(event => event.event_id),
                includeQr: true
              })
            }
          }
          toast({
            title: "Success",
            description: `Emails sent to ${invitationIds.length} invitations`,
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
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isRefreshing && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <div className="animate-spin h-4 w-4 border-2 border-gold-600 border-t-transparent rounded-full"></div>
              Refreshing...
            </div>
          )}
          <Button
            onClick={handleCreateInvitation}
            className="bg-gold-600 hover:bg-gold-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invitation
          </Button>
          <Button
            onClick={() => setShowImportDialog(true)}
            variant="outline"
            className="bg-gold-50 border-gold-200 text-gold-700 hover:bg-gold-100"
          >
            <Upload className="h-4 w-4 mr-2" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <InvitationsTable
        invitations={invitations}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        initialFilters={initialFilters}
        onPageChange={handlePageChange}
        onFiltersChange={handleFiltersChange}
        onEdit={handleEditInvitation}
        onDelete={handleDeleteInvitation}
        onRegenerateInviteToken={handleRegenerateInviteToken}
        onRegenerateEventToken={handleRegenerateEventToken}
        onSendEmail={handleSendEmail}
        onView={handleViewInvitation}
        onExport={handleExport}
        onBulkAction={handleBulkAction}
        loading={loading || isRefreshing}
      />

      {/* Dialogs */}
      <InvitationForm
        open={showInvitationForm}
        onOpenChange={setShowInvitationForm}
        invitation={editingInvitation}
        onSave={handleSaveInvitation}
        loading={loading}
      />

      <SendEmailDialog
        open={showSendEmailDialog}
        onOpenChange={setShowSendEmailDialog}
        invitation={selectedInvitation}
        onSend={handleSendEmailConfirm}
        loading={sendingEmail}
      />

      <ImportCsvDialog
        open={showImportDialog}
        onOpenChange={setShowImportDialog}
        onImport={handleImport}
        loading={loading}
      />

      <ViewInvitationDialog
        open={showViewDialog}
        onOpenChange={setShowViewDialog}
        invitation={viewingInvitation}
      />
    </div>
  )
}
