export interface Announcement {
  id: string
  title: string
  content: string // HTML content from WYSIWYG editor
  subject: string
  created_by: string
  created_at: string
  updated_at: string
  scheduled_at?: string
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
  batch_size: number
  total_recipients: number
  sent_count: number
  failed_count: number
}

export interface AnnouncementRecipient {
  id: string
  announcement_id: string
  guest_id: string
  email: string
  status: 'pending' | 'sent' | 'failed' | 'skipped'
  sent_at?: string
  error_message?: string
  created_at: string
  guest?: {
    id: string
    first_name: string
    last_name: string
    email: string
  }
}

export interface AnnouncementBatch {
  id: string
  announcement_id: string
  batch_number: number
  total_in_batch: number
  sent_count: number
  failed_count: number
  status: 'pending' | 'sending' | 'completed' | 'failed'
  started_at?: string
  completed_at?: string
  created_at: string
}

export interface AnnouncementStats {
  total_recipients: number
  sent_count: number
  failed_count: number
  pending_count: number
  status: string
  scheduled_at?: string
  created_at: string
  recipient_breakdown: {
    sent: number
    failed: number
    pending: number
    skipped: number
  }
}

export interface CreateAnnouncementRequest {
  title: string
  content: string
  subject: string
  guest_ids?: string[]
  send_to_all?: boolean
  scheduled_at?: string
  batch_size?: number
}

export interface AnnouncementListResponse {
  announcements: Announcement[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}

export interface AnnouncementFilters {
  status?: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
  search?: string
  sort_by?: 'created_at' | 'scheduled_at' | 'title' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  page_size: number
}

export interface GuestSelection {
  id: string
  first_name: string
  last_name: string
  email: string
  is_vip: boolean
  household?: {
    id: string
    name: string
  }
  selected?: boolean
}
