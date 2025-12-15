'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import {
  Mail,
  MessageSquare,
  Phone,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  Eye,
  RefreshCw,
  Calendar,
  Users,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Send,
  List,
  LayoutGrid,
} from 'lucide-react'
import { format } from 'date-fns'
import { Checkbox } from '@/components/ui/checkbox'
import ResendNotificationsDialog from './ResendNotificationsDialog'

interface NotificationLog {
  id: string
  log_source: 'mail_logs' | 'notification_logs'
  token?: string
  email?: string
  recipient_email?: string
  recipient_phone?: string
  recipient_id?: string
  sent_at?: string
  created_at?: string
  delivered_at?: string
  success?: boolean
  status?: 'delivered' | 'failed'
  channel?: 'email' | 'sms' | 'whatsapp'
  notification_type?: string
  error_message?: string
  message_id?: string
  notificationapi_id?: string
  parameters?: Record<string, any>
  meta?: Record<string, any>
  invitation_id?: string
  guest_name?: string
}

interface GroupedGuest {
  guest_id?: string
  guest_name: string
  guest_email?: string
  guest_phone?: string
  invitation_events_count: number
  notifications_received: number
  missing_count: number
  successful: number
  failed: number
  last_notification: string | null
  invitation_ids?: string[]
  invitation_event_ids?: Record<string, string[]> // Map of invitation ID to event IDs
  logs: NotificationLog[]
}

interface SummaryStats {
  total_sent: number
  successful: number
  failed: number
  unique_guests_notified: number
  total_guests: number
  guests_with_missing_notifications: number
}

interface NotificationLogsClientProps {
  initialPage: number
  initialFilters: {
    channel?: string
    status?: string
    date_from?: string
    date_to?: string
    search?: string
    log_type?: 'mail' | 'notification' | 'all'
  }
}

export default function NotificationLogsClient({
  initialPage,
  initialFilters,
}: NotificationLogsClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [logs, setLogs] = useState<NotificationLog[]>([])
  const [groupedGuests, setGroupedGuests] = useState<GroupedGuest[]>([])
  const [summary, setSummary] = useState<SummaryStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'individual' | 'grouped'>('individual')
  const [showMissingOnly, setShowMissingOnly] = useState(false)
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set())
  const [expandedGuests, setExpandedGuests] = useState<Set<string>>(new Set())
  const [showResendDialog, setShowResendDialog] = useState(false)

  const [filters, setFilters] = useState({
    channel: initialFilters.channel || '',
    status: initialFilters.status || '',
    date_from: initialFilters.date_from || '',
    date_to: initialFilters.date_to || '',
    search: initialFilters.search || '',
    log_type: initialFilters.log_type || 'all',
  })

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('page_size', '20')
      if (filters.channel) params.set('channel', filters.channel)
      if (filters.status) params.set('status', filters.status)
      if (filters.date_from) params.set('date_from', filters.date_from)
      if (filters.date_to) params.set('date_to', filters.date_to)
      if (filters.search) params.set('search', filters.search)
      if (filters.log_type) params.set('log_type', filters.log_type)

      const response = await fetch(`/api/admin/notification-logs?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setLogs(data.logs || [])
        setGroupedGuests(data.grouped_by_guest || [])
        setSummary(data.summary || null)
        setTotalCount(data.pagination?.total_count || 0)
        setTotalPages(data.pagination?.total_pages || 0)
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch notification logs',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fetching logs:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch notification logs',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, filters])

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setPage(1)
    // Update URL
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    router.push(`/admin/notification-logs?${params.toString()}`)
  }

  const handleViewDetails = (log: NotificationLog) => {
    setSelectedLog(log)
    setShowDetailDialog(true)
  }

  const getChannelIcon = (channel?: string) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
        return <Phone className="h-4 w-4" />
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      default:
        return <Mail className="h-4 w-4" />
    }
  }

  const getChannelBadgeColor = (channel?: string) => {
    switch (channel) {
      case 'email':
        return 'bg-blue-100 text-blue-800'
      case 'sms':
        return 'bg-green-100 text-green-800'
      case 'whatsapp':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a')
    } catch {
      return dateString
    }
  }

  const toggleGuestSelection = (guestKey: string) => {
    setSelectedGuests(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guestKey)) {
        newSet.delete(guestKey)
      } else {
        newSet.add(guestKey)
      }
      return newSet
    })
  }

  const toggleGuestExpansion = (guestKey: string) => {
    setExpandedGuests(prev => {
      const newSet = new Set(prev)
      if (newSet.has(guestKey)) {
        newSet.delete(guestKey)
      } else {
        newSet.add(guestKey)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    const guestsToSelect = filteredGroupedGuests
      .filter(guest => guest.missing_count > 0)
      .map(guest => guest.guest_id || guest.guest_name)
    
    if (selectedGuests.size === guestsToSelect.length) {
      setSelectedGuests(new Set())
    } else {
      setSelectedGuests(new Set(guestsToSelect))
    }
  }

  const filteredGroupedGuests = showMissingOnly
    ? groupedGuests.filter(guest => guest.missing_count > 0)
    : groupedGuests

  const selectedGuestsForResend = filteredGroupedGuests.filter(guest => {
    const key = guest.guest_id || guest.guest_name
    return selectedGuests.has(key)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold">Notification Logs</h1>
          <p className="text-sm text-gray-600 mt-1">
            Track all notifications sent to guests ({totalCount} total)
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Summary Statistics Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Sent</p>
                  <p className="text-2xl font-bold mt-1">{summary.total_sent}</p>
                </div>
                <Mail className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Successful</p>
                  <p className="text-2xl font-bold mt-1 text-green-600">{summary.successful}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Failed</p>
                  <p className="text-2xl font-bold mt-1 text-red-600">{summary.failed}</p>
                </div>
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Missing Notifications</p>
                  <p className="text-2xl font-bold mt-1 text-orange-600">{summary.guests_with_missing_notifications}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {summary.unique_guests_notified} of {summary.total_guests} guests notified
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Toggle and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'individual' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('individual')}
          >
            <List className="h-4 w-4 mr-2" />
            Individual Logs
          </Button>
          <Button
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grouped')}
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Grouped by Guest
          </Button>
          {viewMode === 'grouped' && (
            <div className="flex items-center gap-2 ml-4">
              <Checkbox
                id="show-missing"
                checked={showMissingOnly}
                onCheckedChange={(checked) => setShowMissingOnly(checked === true)}
              />
              <Label htmlFor="show-missing" className="text-sm cursor-pointer">
                Show only guests with missing notifications
              </Label>
            </div>
          )}
        </div>
        {viewMode === 'grouped' && selectedGuests.size > 0 && (
          <Button
            onClick={() => setShowResendDialog(true)}
            className="bg-gold-600 text-white hover:bg-gold-700"
            size="sm"
          >
            <Send className="h-4 w-4 mr-2" />
            Resend to {selectedGuests.size} Guest{selectedGuests.size !== 1 ? 's' : ''}
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Email, phone, or token..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="log_type">Log Type</Label>
              <Select value={filters.log_type} onValueChange={(value) => handleFilterChange('log_type', value)}>
                <SelectTrigger id="log_type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Logs</SelectItem>
                  <SelectItem value="mail">Mail Logs</SelectItem>
                  <SelectItem value="notification">Notification Logs</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel">Channel</Label>
              <Select 
                value={filters.channel || 'all'} 
                onValueChange={(value) => handleFilterChange('channel', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="channel">
                  <SelectValue placeholder="All channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={filters.status || 'all'} 
                onValueChange={(value) => handleFilterChange('status', value === 'all' ? '' : value)}
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_from">Date From</Label>
              <Input
                id="date_from"
                type="date"
                value={filters.date_from}
                onChange={(e) => handleFilterChange('date_from', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date_to">Date To</Label>
              <Input
                id="date_to"
                type="date"
                value={filters.date_to}
                onChange={(e) => handleFilterChange('date_to', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : viewMode === 'grouped' ? (
            filteredGroupedGuests.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No guests found</p>
                <p className="text-sm text-gray-500 mt-2">
                  {showMissingOnly 
                    ? 'No guests with missing notifications'
                    : 'Try adjusting your filters or check back later'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        {viewMode === 'grouped' && (
                          <Checkbox
                            checked={selectedGuests.size > 0 && selectedGuests.size === filteredGroupedGuests.filter(g => g.missing_count > 0).length}
                            onCheckedChange={handleSelectAll}
                          />
                        )}
                      </TableHead>
                      <TableHead>Guest</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Invitation Events</TableHead>
                      <TableHead>Notifications Received</TableHead>
                      <TableHead>Missing</TableHead>
                      <TableHead>Success/Failed</TableHead>
                      <TableHead>Last Notification</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroupedGuests.map((guest) => {
                      const guestKey = guest.guest_id || guest.guest_name
                      const isSelected = selectedGuests.has(guestKey)
                      const isExpanded = expandedGuests.has(guestKey)
                      const hasMissing = guest.missing_count > 0

                      return (
                        <React.Fragment key={guestKey}>
                          <TableRow 
                            className={hasMissing ? 'bg-orange-50' : ''}
                          >
                            <TableCell>
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleGuestSelection(guestKey)}
                                disabled={!hasMissing}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0"
                                  onClick={() => toggleGuestExpansion(guestKey)}
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                <div className="max-w-[200px] truncate font-medium" title={guest.guest_name}>
                                  {guest.guest_name}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {guest.guest_email && (
                                  <div className="text-xs text-gray-600 truncate max-w-[150px]" title={guest.guest_email}>
                                    {guest.guest_email}
                                  </div>
                                )}
                                {guest.guest_phone && (
                                  <div className="text-xs text-gray-600 truncate max-w-[150px]" title={guest.guest_phone}>
                                    {guest.guest_phone}
                                  </div>
                                )}
                                {!guest.guest_email && !guest.guest_phone && (
                                  <span className="text-xs text-gray-400">No contact info</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{guest.invitation_events_count}</span>
                            </TableCell>
                            <TableCell>
                              <span className="font-medium">{guest.notifications_received}</span>
                            </TableCell>
                            <TableCell>
                              {hasMissing ? (
                                <Badge className="bg-orange-100 text-orange-800">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  {guest.missing_count} missing
                                </Badge>
                              ) : (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Complete
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Badge className="bg-green-100 text-green-800">
                                  {guest.successful} ✓
                                </Badge>
                                {guest.failed > 0 && (
                                  <Badge className="bg-red-100 text-red-800">
                                    {guest.failed} ✗
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm text-gray-600">
                                {guest.last_notification ? formatDate(guest.last_notification) : 'Never'}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleGuestExpansion(guestKey)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && guest.logs.length > 0 && (
                            <TableRow>
                              <TableCell colSpan={9} className="bg-gray-50">
                                <div className="p-4">
                                  <h4 className="font-medium mb-3">Notification Details</h4>
                                  <div className="space-y-2">
                                    {guest.logs.map((log, index) => {
                                      const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
                                      const recipient = log.email || log.recipient_email || log.recipient_phone || 'N/A'
                                      const sentDate = log.sent_at || log.delivered_at || log.created_at

                                      return (
                                        <div key={log.id || `log-${index}-${sentDate}`} className="flex items-center justify-between p-2 bg-white rounded border">
                                          <div className="flex items-center gap-4">
                                            <Badge className={getChannelBadgeColor(log.channel)}>
                                              {getChannelIcon(log.channel)}
                                              <span className="ml-1">{log.channel || 'email'}</span>
                                            </Badge>
                                            <span className="text-sm text-gray-600">{formatDate(sentDate)}</span>
                                            <span className="text-sm text-gray-600">{recipient}</span>
                                            {isSuccess ? (
                                              <Badge className="bg-green-100 text-green-800">
                                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                                Success
                                              </Badge>
                                            ) : (
                                              <Badge className="bg-red-100 text-red-800">
                                                <XCircle className="h-3 w-3 mr-1" />
                                                Failed
                                              </Badge>
                                            )}
                                          </div>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleViewDetails(log)}
                                          >
                                            <Eye className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No notification logs found</p>
              <p className="text-sm text-gray-500 mt-2">
                Try adjusting your filters or check back later
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message ID</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => {
                    const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
                    const recipient = log.email || log.recipient_email || log.recipient_phone || 'N/A'
                    const sentDate = log.sent_at || log.delivered_at || log.created_at
                    const messageId = log.message_id || log.notificationapi_id || 'N/A'
                    const guestName = log.guest_name

                    return (
                      <TableRow key={log.id || `log-${index}-${sentDate}`}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">{formatDate(sentDate)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate font-medium" title={guestName}>
                            {guestName || '-'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getChannelBadgeColor(log.channel)}>
                            <span className="flex items-center gap-1">
                              {getChannelIcon(log.channel)}
                              {log.channel || 'email'}
                            </span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate" title={recipient}>
                            {recipient}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {log.notification_type || log.log_source === 'mail_logs' ? 'Invitation' : 'Notification'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {isSuccess ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Success
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Failed
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[150px] truncate text-xs text-gray-600" title={messageId}>
                            {messageId}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, totalCount)} of {totalCount} logs
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Notification Log Details</DialogTitle>
            <DialogDescription>Complete information about this notification</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-gray-500">Log Source</Label>
                  <p className="font-medium">{selectedLog.log_source}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Channel</Label>
                  <Badge className={getChannelBadgeColor(selectedLog.channel)}>
                    {selectedLog.channel || 'email'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Status</Label>
                  {selectedLog.success !== undefined ? (
                    selectedLog.success ? (
                      <Badge className="bg-green-100 text-green-800">Success</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">Failed</Badge>
                    )
                  ) : selectedLog.status === 'delivered' ? (
                    <Badge className="bg-green-100 text-green-800">Delivered</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-800">Failed</Badge>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Sent At</Label>
                  <p className="font-medium">{formatDate(selectedLog.sent_at || selectedLog.delivered_at || selectedLog.created_at)}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Recipient Email</Label>
                  <p className="font-medium">{selectedLog.email || selectedLog.recipient_email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-xs text-gray-500">Recipient Phone</Label>
                  <p className="font-medium">{selectedLog.recipient_phone || 'N/A'}</p>
                </div>
                {selectedLog.token && (
                  <div>
                    <Label className="text-xs text-gray-500">Token</Label>
                    <p className="font-mono text-xs break-all">{selectedLog.token}</p>
                  </div>
                )}
                {selectedLog.message_id && (
                  <div>
                    <Label className="text-xs text-gray-500">Message ID</Label>
                    <p className="font-mono text-xs break-all">{selectedLog.message_id}</p>
                  </div>
                )}
                {selectedLog.notificationapi_id && (
                  <div>
                    <Label className="text-xs text-gray-500">NotificationAPI ID</Label>
                    <p className="font-mono text-xs break-all">{selectedLog.notificationapi_id}</p>
                  </div>
                )}
                {selectedLog.notification_type && (
                  <div>
                    <Label className="text-xs text-gray-500">Notification Type</Label>
                    <p className="font-medium">{selectedLog.notification_type}</p>
                  </div>
                )}
              </div>

              {selectedLog.error_message && (
                <div>
                  <Label className="text-xs text-gray-500">Error Message</Label>
                  <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">{selectedLog.error_message}</p>
                  </div>
                </div>
              )}

              {(selectedLog.parameters || selectedLog.meta) && (
                <div>
                  <Label className="text-xs text-gray-500">Additional Data</Label>
                  <div className="mt-1 p-3 bg-gray-50 border border-gray-200 rounded-md">
                    <pre className="text-xs overflow-auto">
                      {JSON.stringify(selectedLog.parameters || selectedLog.meta, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Resend Notifications Dialog */}
      <ResendNotificationsDialog
        open={showResendDialog}
        onOpenChange={setShowResendDialog}
        guests={selectedGuestsForResend}
        onComplete={fetchLogs}
      />
    </div>
  )
}
