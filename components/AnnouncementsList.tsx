'use client'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/Card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Eye,
  RefreshCw
} from 'lucide-react'
import type { Announcement, AnnouncementStats } from '@/lib/types/announcements'

interface AnnouncementsListProps {
  onCreateNew: () => void
  onEdit: (announcement: Announcement) => void
  onView: (announcement: Announcement) => void
}

export default function AnnouncementsList({ onCreateNew, onEdit, onView }: AnnouncementsListProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  useEffect(() => {
    loadAnnouncements()
  }, [page, statusFilter, searchTerm])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(searchTerm && { search: searchTerm })
      })

      const response = await fetch(`/api/admin/announcements?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setAnnouncements(data.announcements)
        setTotalPages(data.total_pages)
      } else {
        throw new Error(data.error || 'Failed to load announcements')
      }
    } catch (error) {
      console.error('Error loading announcements:', error)
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}/send`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: data.message,
        })
        loadAnnouncements()
      } else {
        throw new Error(data.error || 'Failed to send announcement')
      }
    } catch (error) {
      console.error('Error sending announcement:', error)
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      })
    }
  }

  const handleResend = async (announcement: Announcement) => {
    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}/resend`, {
        method: 'POST'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Announcement reset for resending",
        })
        loadAnnouncements()
      } else {
        throw new Error(data.error || 'Failed to reset announcement')
      }
    } catch (error) {
      console.error('Error resending announcement:', error)
      toast({
        title: "Error",
        description: "Failed to reset announcement",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (announcement: Announcement) => {
    if (!confirm(`Are you sure you want to delete "${announcement.title}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/announcements/${announcement.id}`, {
        method: 'DELETE'
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: "Announcement deleted successfully",
        })
        loadAnnouncements()
      } else {
        throw new Error(data.error || 'Failed to delete announcement')
      }
    } catch (error) {
      console.error('Error deleting announcement:', error)
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Edit className="h-4 w-4" />
      case 'scheduled':
        return <Clock className="h-4 w-4" />
      case 'sending':
        return <RefreshCw className="h-4 w-4 animate-spin" />
      case 'sent':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'cancelled':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <AlertCircle className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800'
      case 'scheduled':
        return 'bg-blue-100 text-blue-800'
      case 'sending':
        return 'bg-yellow-100 text-yellow-800'
      case 'sent':
        return 'bg-green-100 text-green-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      case 'cancelled':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Announcements</h2>
          <p className="text-gray-600">Manage and send announcements to your guests</p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center space-x-2">
          <Plus className="h-4 w-4" />
          <span>New Announcement</span>
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search announcements..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="sending">Sending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Announcements List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No announcements found</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold">{announcement.title}</h3>
                    <Badge className={`${getStatusColor(announcement.status)} flex items-center space-x-1`}>
                      {getStatusIcon(announcement.status)}
                      <span className="capitalize">{announcement.status}</span>
                    </Badge>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{announcement.subject}</p>
                  
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Created: {formatDate(announcement.created_at)}</span>
                    {announcement.scheduled_at && (
                      <span>Scheduled: {formatDate(announcement.scheduled_at)}</span>
                    )}
                    <span>Recipients: {announcement.total_recipients}</span>
                    <span>Sent: {announcement.sent_count}</span>
                    {announcement.failed_count > 0 && (
                      <span className="text-red-500">Failed: {announcement.failed_count}</span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onView(announcement)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  {announcement.status === 'draft' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(announcement)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {announcement.status === 'draft' && (
                    <Button
                      size="sm"
                      onClick={() => handleSend(announcement)}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  
                  {announcement.status === 'sent' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResend(announcement)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(announcement)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
