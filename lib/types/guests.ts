export interface Guest {
  id: string
  first_name: string
  last_name: string
  email?: string
  phone?: string
  household_id?: string
  is_vip: boolean
  gender?: 'male' | 'female'
  total_guests?: number
  created_at: string
  updated_at: string
  household?: {
    id: string
    name: string
  }
  invitations?: Invitation[]
  latest_rsvp?: {
    status: 'pending' | 'accepted' | 'declined' | 'waitlist'
    created_at: string
  }
}

export interface Invitation {
  id: string
  guest_id: string
  token: string
  created_at: string
  updated_at: string
  invitation_events?: InvitationEvent[]
}

export interface RsvpGuest {
  id: string
  invitation_event_id: string
  guest_index: number
  name?: string
  food_choice?: string
  created_at: string
  updated_at: string
}

export interface InvitationEvent {
  id: string
  event_id: string
  status: 'pending' | 'accepted' | 'declined' | 'waitlist'
  headcount: number
  event_token: string
  created_at: string
  event?: {
    id: string
    name: string
    starts_at: string
    venue?: string
    address?: string
  }
  rsvps_v2?: {
    response: 'pending' | 'accepted' | 'declined' | 'waitlist'
    party_size: number
    message?: string
    created_at: string
  }[]
  rsvp_guests?: RsvpGuest[]
}

export interface Household {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  action: 'guest_create' | 'guest_update' | 'guest_delete' | 'invite_regenerate' | 'invite_email_send'
  actor_id: string
  entity: 'guest' | 'invitation'
  entity_id: string
  delta?: Record<string, unknown>
  created_at: string
}

export interface MailLog {
  id: string
  token: string
  email: string
  sent_at: string
  success: boolean
  error_message?: string
}

export interface GuestFilters {
  search?: string
  rsvp_status?: 'pending' | 'accepted' | 'declined' | 'waitlist'
  is_vip?: boolean
  sort_by?: 'name' | 'updated_at' | 'status'
  sort_order?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  page_size: number
}

export interface GuestListResponse {
  guests: Guest[]
  total_count: number
  page: number
  page_size: number
  total_pages: number
}
