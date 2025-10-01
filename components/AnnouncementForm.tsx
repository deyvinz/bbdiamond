'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/Card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/components/ui/use-toast'
import AnnouncementEditor from './AnnouncementEditor'
import GuestSelection from './GuestSelection'
import { Calendar, Clock, Users, Mail, Save, Send } from 'lucide-react'
import type { CreateAnnouncementRequest } from '@/lib/types/announcements'

interface AnnouncementFormProps {
  onSave?: (announcement: CreateAnnouncementRequest) => void
  onSend?: (announcement: CreateAnnouncementRequest) => void
  initialData?: Partial<CreateAnnouncementRequest>
  loading?: boolean
}

export default function AnnouncementForm({ 
  onSave, 
  onSend, 
  initialData = {},
  loading = false 
}: AnnouncementFormProps) {
  const [title, setTitle] = useState(initialData.title || '')
  const [subject, setSubject] = useState(initialData.subject || '')
  const [content, setContent] = useState(initialData.content || '')
  const [selectedGuests, setSelectedGuests] = useState<string[]>(initialData.guest_ids || [])
  const [sendToAll, setSendToAll] = useState(initialData.send_to_all || false)
  const [scheduledAt, setScheduledAt] = useState(initialData.scheduled_at || '')
  const [batchSize, setBatchSize] = useState(initialData.batch_size || 50)
  const [isScheduled, setIsScheduled] = useState(!!initialData.scheduled_at)
  
  const { toast } = useToast()

  const handleSave = () => {
    if (!validateForm()) return

    const announcement: CreateAnnouncementRequest = {
      title,
      subject,
      content,
      guest_ids: sendToAll ? undefined : selectedGuests,
      send_to_all: sendToAll,
      scheduled_at: isScheduled ? scheduledAt : undefined,
      batch_size: batchSize
    }

    onSave?.(announcement)
  }

  const handleSend = () => {
    if (!validateForm()) return

    const announcement: CreateAnnouncementRequest = {
      title,
      subject,
      content,
      guest_ids: sendToAll ? undefined : selectedGuests,
      send_to_all: sendToAll,
      scheduled_at: isScheduled ? scheduledAt : undefined,
      batch_size: batchSize
    }

    onSend?.(announcement)
  }

  const validateForm = () => {
    if (!title.trim()) {
      toast({
        title: "Validation Error",
        description: "Title is required",
        variant: "destructive",
      })
      return false
    }

    if (!subject.trim()) {
      toast({
        title: "Validation Error",
        description: "Email subject is required",
        variant: "destructive",
      })
      return false
    }

    if (!content.trim()) {
      toast({
        title: "Validation Error",
        description: "Content is required",
        variant: "destructive",
      })
      return false
    }

    if (!sendToAll && selectedGuests.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one guest or choose to send to all",
        variant: "destructive",
      })
      return false
    }

    if (isScheduled && !scheduledAt) {
      toast({
        title: "Validation Error",
        description: "Please select a scheduled time",
        variant: "destructive",
      })
      return false
    }

    if (batchSize < 20 || batchSize > 100) {
      toast({
        title: "Validation Error",
        description: "Batch size must be between 20 and 100",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Announcement Details</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter announcement title..."
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor="subject">Email Subject *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject line..."
              className="mt-1"
            />
          </div>
        </div>
      </Card>

      {/* Content Editor */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Content</h3>
        <AnnouncementEditor
          content={content}
          onChange={setContent}
          placeholder="Write your announcement content here..."
        />
      </Card>

      {/* Guest Selection */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Recipients</h3>
        <GuestSelection
          selectedGuests={selectedGuests}
          onSelectionChange={setSelectedGuests}
          sendToAll={sendToAll}
          onSendToAllChange={setSendToAll}
        />
      </Card>

      {/* Scheduling and Settings */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Scheduling & Settings</h3>
        <div className="space-y-4">
          {/* Scheduling */}
          <div className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="schedule"
              checked={isScheduled}
              onChange={(e) => setIsScheduled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="schedule" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Schedule for later</span>
            </Label>
          </div>

          {isScheduled && (
            <div>
              <Label htmlFor="scheduled-at">Scheduled Date & Time</Label>
              <Input
                id="scheduled-at"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="mt-1"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <Separator />

          {/* Batch Size */}
          <div>
            <Label htmlFor="batch-size">Batch Size (20-100 emails per batch)</Label>
            <Input
              id="batch-size"
              type="number"
              min="20"
              max="100"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 50)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Larger batches send faster but may hit email service limits
            </p>
          </div>
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3">
        <Button
          variant="outline"
          onClick={handleSave}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <Save className="h-4 w-4" />
          <span>Save Draft</span>
        </Button>
        
        <Button
          onClick={handleSend}
          disabled={loading}
          className="flex items-center space-x-2"
        >
          <Send className="h-4 w-4" />
          <span>{isScheduled ? 'Schedule' : 'Send Now'}</span>
        </Button>
      </div>
    </div>
  )
}
