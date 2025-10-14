export interface AppConfig {
  id: string
  key: string
  value: string
  description?: string
  created_at: string
  updated_at: string
}

export interface ConfigValue {
  plus_ones_enabled: boolean
  max_party_size: number
  allow_guest_plus_ones: boolean
  rsvp_enabled: boolean
  rsvp_cutoff_date?: string // ISO 8601 date-time string
  rsvp_cutoff_timezone?: string // IANA timezone (e.g., "America/New_York")
}

export interface ConfigUpdate {
  plus_ones_enabled?: boolean
  max_party_size?: number
  allow_guest_plus_ones?: boolean
  rsvp_enabled?: boolean
  rsvp_cutoff_date?: string
  rsvp_cutoff_timezone?: string
}

// Default configuration values
export const DEFAULT_CONFIG: ConfigValue = {
  plus_ones_enabled: false,
  max_party_size: 1,
  allow_guest_plus_ones: false,
  rsvp_enabled: true,
  rsvp_cutoff_date: undefined,
  rsvp_cutoff_timezone: 'America/New_York',
}

// Common timezones for RSVP cutoff
export const COMMON_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Anchorage', label: 'Alaska Time (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii Time (HT)' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
  { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
  { value: 'Africa/Lagos', label: 'Lagos (WAT)' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Shanghai', label: 'China (CST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT/AEST)' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZDT/NZST)' },
]
