'use client'

import { useState, useEffect } from 'react'
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
} from 'lucide-react'
import { format } from 'date-fns'

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
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(initialPage)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null)
  const [showDetailDialog, setShowDetailDialog] = useState(false)

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
                  {logs.map((log) => {
                    const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
                    const recipient = log.email || log.recipient_email || log.recipient_phone || 'N/A'
                    const sentDate = log.sent_at || log.delivered_at || log.created_at
                    const messageId = log.message_id || log.notificationapi_id || 'N/A'
                    const guestName = log.guest_name

                    return (
                      <TableRow key={log.id}>
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
    </div>
  )
}
