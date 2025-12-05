'use client'

import { useState, useMemo } from 'react'
import { Guest, GuestFilters } from '@/lib/types/guests'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  MoreHorizontal,
  Search,
  Filter,
  Download,
  Mail,
  Copy,
  RefreshCw,
  Trash2,
  Edit,
  Eye,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

interface GuestTableProps {
  guests: Guest[]
  totalCount: number
  page: number
  pageSize: number
  totalPages: number
  initialFilters: GuestFilters
  onPageChange: (page: number) => void
  onFiltersChange: (filters: GuestFilters) => void
  onEdit: (guest: Guest) => void
  onDelete: (guestId: string) => void
  onRegenerateToken: (guestId: string, eventId: string) => void
  onSendInvite: (guestId: string, eventId: string) => void
  onExport: () => void
  onBulkAction?: (action: string, guestIds: string[]) => void
  onSendInvitesToAll?: () => void
  onCreateMissingInvitations?: () => void
  onView: (guest: Guest) => void
  loading?: boolean
}

function GuestTable({
  guests,
  totalCount,
  page,
  pageSize,
  totalPages,
  initialFilters,
  onPageChange,
  onFiltersChange,
  onEdit,
  onDelete,
  onRegenerateToken,
  onSendInvite,
  onExport,
  onBulkAction,
  onSendInvitesToAll,
  onCreateMissingInvitations,
  onView,
  loading = false,
}: GuestTableProps) {
  const [filters, setFilters] = useState<GuestFilters>(initialFilters)
  const [selectedGuests, setSelectedGuests] = useState<string[]>([])
  const { toast } = useToast()

  // Use guests directly since filtering is done server-side
  const filteredGuests = guests

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedGuests(filteredGuests.map(g => g.id))
    } else {
      setSelectedGuests([])
    }
  }

  const handleSelectGuest = (guestId: string, checked: boolean) => {
    if (checked) {
      setSelectedGuests(prev => [...prev, guestId])
    } else {
      setSelectedGuests(prev => prev.filter(id => id !== guestId))
    }
  }

  const handleSearch = (value: string) => {
    const newFilters = { ...filters, search: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleFilterChange = (key: keyof GuestFilters, value: string | boolean | undefined) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const handleCopyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      toast({
        title: "Token copied",
        description: "Invitation token copied to clipboard",
      })
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Failed to copy token to clipboard",
        variant: "destructive",
      })
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-gold-600 text-white">Accepted</Badge>
      case 'declined':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Declined</Badge>
      case 'waitlist':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Waitlist</Badge>
      default:
        return <Badge className="border-gold-200 text-white">Pending</Badge>
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl lg:text-2xl font-serif">Guests</h1>
          <Badge>{filteredGuests.length} of {totalCount}</Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onExport} variant="outline" size="sm" className="flex-1 sm:flex-none">
            <Download className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Export CSV</span>
          </Button>
          {onCreateMissingInvitations && (
            <Button 
              onClick={onCreateMissingInvitations} 
              variant="outline" 
              size="sm" 
              className="border-blue-200 text-blue-700 hover:bg-blue-50 flex-1 sm:flex-none"
              disabled={loading}
            >
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Missing Invitations</span>
            </Button>
          )}
          {onSendInvitesToAll && (
            <Button 
              onClick={onSendInvitesToAll} 
              variant="default" 
              size="sm" 
              className="bg-gold-600 text-white hover:bg-gold-700 flex-1 sm:flex-none"
              disabled={loading}
            >
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{loading ? 'Sending...' : 'Send Invites to All'}</span>
            </Button>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search guests..."
            value={filters.search || ''}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={filters.rsvp_status || ''}
            onChange={(e) => handleFilterChange('rsvp_status', e.target.value || undefined)}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="declined">Declined</option>
            <option value="waitlist">Waitlist</option>
          </select>

          <select
            value={filters.is_vip === undefined ? '' : filters.is_vip.toString()}
            onChange={(e) => handleFilterChange('is_vip', e.target.value === '' ? undefined : e.target.value === 'true')}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm"
          >
            <option value="">All VIP Status</option>
            <option value="true">VIP Only</option>
            <option value="false">Non-VIP Only</option>
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedGuests.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gold-50 rounded-lg border border-gold-200">
          <span className="text-sm text-gold-700 font-medium">
            {selectedGuests.length} selected
          </span>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction?.('create_invitations', selectedGuests)}
              className="flex-1 sm:flex-none"
            >
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Create Invitations</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction?.('send_invite', selectedGuests)}
              className="flex-1 sm:flex-none"
            >
              <Mail className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send Invites</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction?.('regenerate_tokens', selectedGuests)}
              className="flex-1 sm:flex-none"
            >
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onBulkAction?.('export', selectedGuests)}
              className="flex-1 sm:flex-none"
            >
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onBulkAction?.('delete', selectedGuests)}
              className="flex-1 sm:flex-none"
            >
              <Trash2 className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="border border-gold-100 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow className="bg-gold-50">
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedGuests.length === filteredGuests.length && filteredGuests.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Household</TableHead>
              <TableHead>VIP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : filteredGuests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No guests found
                </TableCell>
              </TableRow>
            ) : (
              filteredGuests.map((guest) => (
              <TableRow key={guest.id} className="hover:bg-gold-50/50">
                <TableCell>
                  <Checkbox
                    checked={selectedGuests.includes(guest.id)}
                    onCheckedChange={(checked) => handleSelectGuest(guest.id, checked as boolean)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {guest.first_name} {guest.last_name || ''}
                </TableCell>
                <TableCell>{guest.email || '-'}</TableCell>
                <TableCell>{guest.phone || '-'}</TableCell>
                <TableCell>{guest.household?.name || '-'}</TableCell>
                <TableCell>
                  {guest.is_vip ? (
                    <Badge className="bg-gold-600 text-white">VIP</Badge>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell>{getStatusBadge(guest.latest_rsvp?.status)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(guest)} className="bg-white">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onView(guest)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onDelete(guest.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-sm text-gray-500 text-center sm:text-left">
          Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, totalCount)} of {totalCount} guests
        </div>
        <div className="flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
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
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

export default GuestTable
