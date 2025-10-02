'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import AnnouncementsList from '@/components/AnnouncementsList'
import AnnouncementForm from '@/components/AnnouncementForm'
import { Card } from '@/components/Card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Eye, Edit } from 'lucide-react'
import type { Announcement, CreateAnnouncementRequest } from '@/lib/types/announcements'

type ViewMode = 'list' | 'create' | 'edit' | 'view'

export default function AnnouncementsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleCreateNew = () => {
    setSelectedAnnouncement(null)
    setViewMode('create')
  }

  const handleEdit = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setViewMode('edit')
  }

  const handleView = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement)
    setViewMode('view')
  }

  const handleBackToList = () => {
    setSelectedAnnouncement(null)
    setViewMode('list')
  }

  const handleSave = async (announcementData: CreateAnnouncementRequest) => {
    try {
      setLoading(true)
      
      const url = selectedAnnouncement 
        ? `/api/admin/announcements/${selectedAnnouncement.id}`
        : '/api/admin/announcements'
      
      const method = selectedAnnouncement ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData)
      })
      
      const data = await response.json()
      
      if (data.success) {
        toast({
          title: "Success",
          description: selectedAnnouncement 
            ? "Announcement updated successfully" 
            : "Announcement created successfully",
        })
        handleBackToList()
      } else {
        throw new Error(data.error || 'Failed to save announcement')
      }
    } catch (error) {
      console.error('Error saving announcement:', error)
      toast({
        title: "Error",
        description: "Failed to save announcement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async (announcementData: CreateAnnouncementRequest) => {
    try {
      setLoading(true)
      
      // First create the announcement
      const createResponse = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(announcementData)
      })
      
      const createData = await createResponse.json()
      
      if (!createData.success) {
        throw new Error(createData.error || 'Failed to create announcement')
      }

      // Then send it
      const sendResponse = await fetch(`/api/admin/announcements/${createData.announcement_id}/send`, {
        method: 'POST'
      })
      
      const sendData = await sendResponse.json()
      
      if (sendData.success) {
        toast({
          title: "Success",
          description: sendData.message,
        })
        handleBackToList()
      } else {
        throw new Error(sendData.error || 'Failed to send announcement')
      }
    } catch (error) {
      console.error('Error sending announcement:', error)
      toast({
        title: "Error",
        description: "Failed to send announcement",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const getInitialData = (): Partial<CreateAnnouncementRequest> => {
    if (!selectedAnnouncement) return {}
    
    return {
      title: selectedAnnouncement.title,
      subject: selectedAnnouncement.subject,
      content: selectedAnnouncement.content,
      scheduled_at: selectedAnnouncement.scheduled_at || undefined,
      batch_size: selectedAnnouncement.batch_size
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link href="/admin">
            <Button variant="outline" size="sm" className="w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-serif">Announcements</h1>
            <p className="text-gray-600 mt-1">
              Send announcements to your wedding guests
            </p>
          </div>
        </div>
      </div>

      {viewMode === 'list' && (
        <AnnouncementsList
          onCreateNew={handleCreateNew}
          onEdit={handleEdit}
          onView={handleView}
        />
      )}

      {(viewMode === 'create' || viewMode === 'edit') && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button variant="outline" onClick={handleBackToList} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">
                {viewMode === 'create' ? 'Create New Announcement' : 'Edit Announcement'}
              </h2>
              <p className="text-gray-600">
                {viewMode === 'create' 
                  ? 'Create and send announcements to your guests'
                  : 'Update announcement details'
                }
              </p>
            </div>
          </div>

          <AnnouncementForm
            initialData={getInitialData()}
            onSave={handleSave}
            onSend={handleSend}
            loading={loading}
          />
        </div>
      )}

      {viewMode === 'view' && selectedAnnouncement && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Button variant="outline" onClick={handleBackToList} className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to List
            </Button>
            <div className="flex-1">
              <h2 className="text-xl sm:text-2xl font-bold">{selectedAnnouncement.title}</h2>
              <p className="text-gray-600">Announcement Details</p>
            </div>
            <Button onClick={() => handleEdit(selectedAnnouncement)} className="w-full sm:w-auto">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Announcement Details */}
            <div className="xl:col-span-2 space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Content</h3>
                <div className="prose prose-sm max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: selectedAnnouncement.content }} />
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Details</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-medium">Subject:</span>
                    <p className="text-gray-600">{selectedAnnouncement.subject}</p>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <p className="text-gray-600 capitalize">{selectedAnnouncement.status}</p>
                  </div>
                  <div>
                    <span className="font-medium">Created:</span>
                    <p className="text-gray-600">
                      {new Date(selectedAnnouncement.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {selectedAnnouncement.scheduled_at && (
                    <div>
                      <span className="font-medium">Scheduled:</span>
                      <p className="text-gray-600">
                        {new Date(selectedAnnouncement.scheduled_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Batch Size:</span>
                    <p className="text-gray-600">{selectedAnnouncement.batch_size}</p>
                  </div>
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Statistics</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Total Recipients:</span>
                    <span className="font-medium">{selectedAnnouncement.total_recipients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sent:</span>
                    <span className="font-medium text-green-600">{selectedAnnouncement.sent_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Failed:</span>
                    <span className="font-medium text-red-600">{selectedAnnouncement.failed_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending:</span>
                    <span className="font-medium text-yellow-600">
                      {selectedAnnouncement.total_recipients - selectedAnnouncement.sent_count - selectedAnnouncement.failed_count}
                    </span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}