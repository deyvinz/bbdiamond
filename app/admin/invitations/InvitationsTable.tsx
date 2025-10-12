'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Mail,
  RefreshCw,
  Copy,
  Trash2,
  Eye,
  Edit,
  Plus,
  QrCode,
  Bell,
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/components/ui/use-toast'
import type { Invitation, InvitationEvent } from '@/lib/invitations-service'

interface InvitationsTableProps {
  invitations: Invitation[]
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
  onPageChange: (page: number) => void
  onFiltersChange: (filters: any) => void
  onClearFilters: () => void
  onEdit: (invitation: Invitation) => void
  onDelete: (invitationId: string) => void
  onRegenerateInviteToken: (invitationId: string) => void
  onRegenerateEventToken: (invitationEventId: string) => void
  onSendEmail: (invitationId: string) => void
  onResendRsvpConfirmation: (invitationId: string) => void
  onView: (invitation: Invitation) => void
  onExport: () => void
  onBulkAction?: (action: string, invitationIds: string[]) => void
  loading?: boolean
}

const statusColors = {
  pending: 'outline',
  accepted: 'default',
  declined: 'default',
  waitlist: 'outline',
}

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  waitlist: 'Waitlist',
}

export default function InvitationsTable({
  invitations,
  totalCount,
  page,
  pageSize,
  totalPages,
  initialFilters,
  onPageChange,
  onFiltersChange,
  onClearFilters,
  onEdit,
  onDelete,
  onRegenerateInviteToken,
  onRegenerateEventToken,
  onSendEmail,
  onResendRsvpConfirmation,
  onView,
  onExport,
  onBulkAction,
  loading = false,
}: InvitationsTableProps) {
  const [filters, setFilters] = useState(initialFilters)
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([])
  const [searchValue, setSearchValue] = useState(filters.q || '')

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, q: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value || undefined }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedInvitations(invitations.map(inv => inv.id))
    } else {
      setSelectedInvitations([])
    }
  }

  const handleSelectInvitation = (invitationId: string, checked: boolean) => {
    if (checked) {
      setSelectedInvitations(prev => [...prev, invitationId])
    } else {
      setSelectedInvitations(prev => prev.filter(id => id !== invitationId))
    }
  }

  const handleCopyInviteLink = (token: string) => {
    const url = `${window.location.origin}/rsvp?token=${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    })
  }

  const handleCopyEventToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Copied!",
      description: "Event token copied to clipboard",
    })
  }

  const handleBulkAction = (action: string) => {
    if (selectedInvitations.length === 0) {
      toast({
        title: "No selection",
        description: "Please select invitations first",
        variant: "destructive",
      })
      return
    }
    onBulkAction?.(action, selectedInvitations)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-gold-700">
            Invitations ({totalCount})
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => onExport()}
              variant="outline"
              size="sm"
              className="bg-gold-50 border-gold-200 text-gold-700 hover:bg-gold-100"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search guests, email, or invite code..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value)
                  handleSearch(e.target.value)
                }}
                className="pl-10"
              />
            </div>
          </div>

          <Select
            value={filters.eventId || 'all'}
            onValueChange={(value) => handleFilterChange('eventId', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Events" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              {/* TODO: Add event options */}
            </SelectContent>
          </Select>

          <Select
            value={filters.status || 'all'}
            onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="declined">Declined</SelectItem>
              <SelectItem value="waitlist">Waitlist</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFilters({})
              setSearchValue('')
              // Clear all filter parameters from URL
              onClearFilters()
            }}
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>

        {/* Bulk Actions */}
        {selectedInvitations.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-gold-50 rounded-lg border border-gold-200">
            <span className="text-sm text-gold-700">
              {selectedInvitations.length} selected
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('send_email')}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Emails
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('send_rsvp_reminder')}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              <Bell className="h-4 w-4 mr-2" />
              Send RSVP Reminders
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('regenerate_tokens')}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate Tokens
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('export')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Selected
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('delete')}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        )}
      </CardHeader>

      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedInvitations.length === invitations.length && invitations.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Guest</TableHead>
                <TableHead>Events</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  </TableRow>
                ))
              ) : invitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No invitations found
                  </TableCell>
                </TableRow>
              ) : (
                invitations.map((invitation) => {
                  // Safety check for null guest
                  if (!invitation.guest) {
                    console.error('Invitation with null guest:', invitation.id)
                    return null
                  }
                  return (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedInvitations.includes(invitation.id)}
                        onCheckedChange={(checked) => 
                          handleSelectInvitation(invitation.id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          {invitation.guest.first_name} {invitation.guest.last_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {invitation.guest.email}
                        </div>
                        <div className="text-xs text-gray-400">
                          Code: {invitation.guest.invite_code}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {invitation.invitation_events.map((event) => (
                          <div key={event.id} className="text-sm">
                            <div className="font-medium">{event.event.name}</div>
                            <div className="text-gray-500">
                              {format(new Date(event.event.starts_at), 'MMM d, yyyy')}
                            </div>
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {invitation.invitation_events.map((event) => (
                          <Badge
                            key={event.id}
                            className={
                              event.status === 'accepted' 
                                ? 'bg-green-100 text-green-800 border-green-300'
                                : event.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                : event.status === 'declined'
                                ? 'bg-gray-100 text-gray-800 border-gray-300'
                                : 'bg-amber-100 text-amber-800 border-amber-300'
                            }
                          >
                            {statusLabels[event.status]}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onView(invitation)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(invitation)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyInviteLink(invitation.token)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Invite Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRegenerateInviteToken(invitation.id)}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Regenerate Invite Token
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onSendEmail(invitation.id)}>
                            <Mail className="h-4 w-4 mr-2" />
                            Send Email
                          </DropdownMenuItem>
                          {invitation.invitation_events.some(event => event.status === 'accepted') && (
                            <DropdownMenuItem onClick={() => onResendRsvpConfirmation(invitation.id)}>
                              <QrCode className="h-4 w-4 mr-2" />
                              Resend RSVP Confirmation
                            </DropdownMenuItem>
                          )}
                          {invitation.invitation_events.map((event) => (
                            <div key={event.id}>
                              <DropdownMenuItem onClick={() => handleCopyEventToken(event.event_token)}>
                                <Copy className="h-4 w-4 mr-2" />
                                Copy Event Token - {event.event.name}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onRegenerateEventToken(event.id)}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Regenerate Event Token - {event.event.name}
                              </DropdownMenuItem>
                            </div>
                          ))}
                          <DropdownMenuItem 
                            onClick={() => onDelete(invitation.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-500">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} invitations
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
