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
}

export interface ConfigUpdate {
  plus_ones_enabled?: boolean
  max_party_size?: number
  allow_guest_plus_ones?: boolean
}

// Default configuration values
export const DEFAULT_CONFIG: ConfigValue = {
  plus_ones_enabled: false,
  max_party_size: 1,
  allow_guest_plus_ones: false,
}
