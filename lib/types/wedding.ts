export interface Wedding {
  id: string
  slug: string
  bride_name: string
  groom_name: string
  couple_display_name: string
  hashtag?: string | null
  primary_date: string
  secondary_dates?: string[] | null
  venue_name: string
  venue_address?: string | null
  city: string
  country: string
  timezone: string
  contact_email: string
  contact_phone?: string | null
  coordinator_email?: string | null
  custom_domain?: string | null
  subdomain?: string | null
  enable_gallery: boolean
  enable_registry: boolean
  enable_travel: boolean
  enable_wedding_party: boolean
  enable_faq: boolean
  registry_url?: string | null
  travel_url?: string | null
  gallery_url?: string | null
  owner_id?: string | null
  status: 'active' | 'inactive' | 'archived'
  created_at: string
  updated_at: string
}

export interface WeddingCreate {
  slug: string
  bride_name: string
  groom_name: string
  couple_display_name: string
  hashtag?: string
  primary_date: string
  secondary_dates?: string[]
  venue_name: string
  venue_address?: string
  city: string
  country: string
  timezone?: string
  contact_email: string
  contact_phone?: string
  coordinator_email?: string
  subdomain?: string
  enable_gallery?: boolean
  enable_registry?: boolean
  enable_travel?: boolean
  enable_wedding_party?: boolean
  enable_faq?: boolean
  registry_url?: string
  travel_url?: string
  gallery_url?: string
}

export interface WeddingUpdate {
  slug?: string
  bride_name?: string
  groom_name?: string
  couple_display_name?: string
  hashtag?: string
  primary_date?: string
  secondary_dates?: string[]
  venue_name?: string
  venue_address?: string
  city?: string
  country?: string
  timezone?: string
  contact_email?: string
  contact_phone?: string
  coordinator_email?: string
  subdomain?: string
  enable_gallery?: boolean
  enable_registry?: boolean
  enable_travel?: boolean
  enable_wedding_party?: boolean
  enable_faq?: boolean
  registry_url?: string
  travel_url?: string
  gallery_url?: string
  status?: 'active' | 'inactive' | 'archived'
}

