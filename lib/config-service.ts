import { supabaseServer } from './supabase-server'
import { supabaseService } from './supabase-service'
import { logAdminAction } from './audit'
import type { AppConfig, ConfigValue, ConfigUpdate } from './types/config'
import { DEFAULT_CONFIG } from './types/config'
import { getWeddingId } from './wedding-context'

export async function getAppConfig(weddingId?: string): Promise<ConfigValue> {
  // Get wedding ID if not provided
  const resolvedWeddingId = weddingId || await getWeddingId()
  
  if (!resolvedWeddingId) {
    console.warn('No wedding ID available, returning default config')
    return DEFAULT_CONFIG
  }

  // No caching - always fetch fresh from database for correctness
  // Use service role client to bypass RLS (config table requires elevated permissions)
  console.log('🔍 [getAppConfig] Fetching from database for wedding:', resolvedWeddingId)
  const supabase = supabaseService()
  
  const { data: configs, error } = await supabase
    .from('wedding_config')
    .select('*')
    .eq('wedding_id', resolvedWeddingId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Config query error:', error)
    return DEFAULT_CONFIG
  }

  console.log('🔍 [getAppConfig] Raw configs from DB:', configs)

  // Convert array of configs to object
  const configMap = configs?.reduce((acc: Record<string, string>, config: AppConfig) => {
    acc[config.key] = config.value
    return acc
  }, {} as Record<string, string>) || {}

  console.log('🔍 [getAppConfig] Config map:', configMap)
  console.log('🔍 [getAppConfig] rsvp_enabled raw value:', configMap.rsvp_enabled, 'type:', typeof configMap.rsvp_enabled)

  // Parse and return config with defaults
  const parsed = {
    plus_ones_enabled: configMap.plus_ones_enabled === 'true',
    max_party_size: parseInt(configMap.max_party_size || '1', 10),
    allow_guest_plus_ones: configMap.allow_guest_plus_ones === 'true',
    // Explicitly check for 'true' string, default to true only if undefined
    rsvp_enabled: configMap.rsvp_enabled === undefined ? true : configMap.rsvp_enabled === 'true',
    rsvp_cutoff_date: configMap.rsvp_cutoff_date && configMap.rsvp_cutoff_date !== 'undefined' ? configMap.rsvp_cutoff_date : undefined,
    rsvp_cutoff_timezone: configMap.rsvp_cutoff_timezone || 'America/New_York',
  }

  console.log('🔍 [getAppConfig] Parsed config:', parsed)
  console.log('🔍 [getAppConfig] rsvp_enabled parsed:', parsed.rsvp_enabled)

  return parsed
}

export async function updateAppConfig(updates: ConfigUpdate, weddingId?: string): Promise<ConfigValue> {
  // Get wedding ID if not provided
  const resolvedWeddingId = weddingId || await getWeddingId()
  
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to update config')
  }

  // Use service role client to bypass RLS policies
  const supabase = supabaseService()
  
  // Prepare config updates - handle undefined values properly
  const configUpdates = Object.entries(updates)
    .map(([key, value]) => {
      // Convert value to string, handling undefined/null specially
      let stringValue: string
      if (value === undefined || value === null) {
        stringValue = ''
      } else {
        stringValue = String(value)
      }
      
      return {
        wedding_id: resolvedWeddingId,
        key,
        value: stringValue,
        description: getConfigDescription(key),
        updated_at: new Date().toISOString(),
      }
    })

  // Upsert each config value
  for (const config of configUpdates) {
    // If value is empty and it's an optional field, delete the row
    if (config.value === '' && (config.key === 'rsvp_cutoff_date' || config.key === 'rsvp_cutoff_timezone')) {
      const { error } = await supabase
        .from('wedding_config')
        .delete()
        .eq('wedding_id', resolvedWeddingId)
        .eq('key', config.key)
      
      if (error && error.code !== 'PGRST116') { // Ignore "not found" errors
        console.error(`Failed to delete config ${config.key}:`, error)
      }
    } else {
      const { error } = await supabase
        .from('wedding_config')
        .upsert({
          wedding_id: resolvedWeddingId,
          key: config.key,
          value: config.value,
          description: config.description,
          updated_at: config.updated_at,
        }, {
          onConflict: 'wedding_id,key'
        })

      if (error) {
        console.error(`Failed to update config ${config.key}:`, error)
        throw new Error(`Failed to update configuration: ${error.message}`)
      }
    }
  }

  // Log audit
  await logAdminAction('config_update', {
    wedding_id: resolvedWeddingId,
    updates,
    updated_keys: Object.keys(updates)
  })

  // Return fresh config directly from database
  return await getFreshAppConfig(resolvedWeddingId)
}

// Helper function to get fresh config directly from database (no cache)
async function getFreshAppConfig(weddingId: string): Promise<ConfigValue> {
  const supabase = supabaseService()
  
  const { data: configs, error } = await supabase
    .from('wedding_config')
    .select('*')
    .eq('wedding_id', weddingId)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Config query error:', error)
    return DEFAULT_CONFIG
  }

  const configMap = configs?.reduce((acc: Record<string, string>, config: AppConfig) => {
    acc[config.key] = config.value
    return acc
  }, {} as Record<string, string>) || {}

  return {
    plus_ones_enabled: configMap.plus_ones_enabled === 'true',
    max_party_size: parseInt(configMap.max_party_size || '1', 10),
    allow_guest_plus_ones: configMap.allow_guest_plus_ones === 'true',
    // Fix: Explicitly check for 'true' string, default to true only if undefined
    rsvp_enabled: configMap.rsvp_enabled === undefined ? true : configMap.rsvp_enabled === 'true',
    rsvp_cutoff_date: configMap.rsvp_cutoff_date && configMap.rsvp_cutoff_date !== 'undefined' ? configMap.rsvp_cutoff_date : undefined,
    rsvp_cutoff_timezone: configMap.rsvp_cutoff_timezone || 'America/New_York',
  }
}

export async function resetAppConfig(weddingId?: string): Promise<ConfigValue> {
  // Get wedding ID if not provided
  const resolvedWeddingId = weddingId || await getWeddingId()
  
  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to reset config')
  }

  // Use service role client to bypass RLS policies
  const supabase = supabaseService()
  
  // Delete all existing configs for this wedding
  const { error: deleteError } = await supabase
    .from('wedding_config')
    .delete()
    .eq('wedding_id', resolvedWeddingId)

  if (deleteError) {
    console.error('Failed to reset config:', deleteError)
    throw new Error(`Failed to reset configuration: ${deleteError.message}`)
  }

  // Insert default configs
  const defaultConfigs = Object.entries(DEFAULT_CONFIG).map(([key, value]) => ({
    wedding_id: resolvedWeddingId,
    key,
    value: String(value),
    description: getConfigDescription(key),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('wedding_config')
    .insert(defaultConfigs)

  if (insertError) {
    console.error('Failed to insert default config:', insertError)
    throw new Error(`Failed to reset configuration: ${insertError.message}`)
  }

  // Log audit
  await logAdminAction('config_reset', {
    wedding_id: resolvedWeddingId,
    default_config: DEFAULT_CONFIG
  })

  // Return fresh config from database
  return await getFreshAppConfig(resolvedWeddingId)
}

function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    plus_ones_enabled: 'Enable or disable plus-one functionality across the site',
    max_party_size: 'Maximum number of people allowed per invitation (including the main guest)',
    allow_guest_plus_ones: 'Allow guests to specify plus-ones when RSVPing',
    rsvp_enabled: 'Enable or disable RSVP functionality for all guests',
    rsvp_cutoff_date: 'Date and time when RSVP closes (ISO 8601 format)',
    rsvp_cutoff_timezone: 'Timezone for the RSVP cutoff date (IANA timezone identifier)',
  }
  return descriptions[key] || 'Application configuration setting'
}

// Helper function to check if plus-ones are enabled
export async function isPlusOnesEnabled(weddingId?: string): Promise<boolean> {
  const config = await getAppConfig(weddingId)
  return config.plus_ones_enabled
}

// Helper function to get max party size
export async function getMaxPartySize(weddingId?: string): Promise<number> {
  const config = await getAppConfig(weddingId)
  return config.max_party_size
}

// Helper function to check if guests can specify plus-ones
export async function canGuestsSpecifyPlusOnes(weddingId?: string): Promise<boolean> {
  const config = await getAppConfig(weddingId)
  return config.plus_ones_enabled && config.allow_guest_plus_ones
}
