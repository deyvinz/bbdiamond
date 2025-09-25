import { supabaseServer } from './supabase-server'
import { bumpNamespaceVersion, cacheJson } from './cache'
import { appConfigKey } from './cache-keys'
import { logAdminAction } from './audit'
import type { AppConfig, ConfigValue, ConfigUpdate } from './types/config'
import { DEFAULT_CONFIG } from './types/config'

const CONFIG_CACHE_TTL = 300 // 5 minutes

export async function getAppConfig(): Promise<ConfigValue> {
  const cacheKey = appConfigKey()
  
  return await cacheJson(cacheKey, CONFIG_CACHE_TTL, async () => {
    const supabase = await supabaseServer()
    
    const { data: configs, error } = await supabase
      .from('app_config')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Config query error:', error)
      // Return default config if database error
      return DEFAULT_CONFIG
    }

    // Convert array of configs to object
    const configMap = configs?.reduce((acc: Record<string, string>, config: AppConfig) => {
      acc[config.key] = config.value
      return acc
    }, {} as Record<string, string>) || {}

    // Parse and return config with defaults
    return {
      plus_ones_enabled: configMap.plus_ones_enabled === 'true',
      max_party_size: parseInt(configMap.max_party_size || '1', 10),
      allow_guest_plus_ones: configMap.allow_guest_plus_ones === 'true',
    }
  })
}

export async function updateAppConfig(updates: ConfigUpdate): Promise<ConfigValue> {
  const supabase = await supabaseServer()
  
  // Prepare config updates
  const configUpdates = Object.entries(updates).map(([key, value]) => ({
    key,
    value: String(value),
    description: getConfigDescription(key),
    updated_at: new Date().toISOString(),
  }))

  // Upsert each config value
  for (const config of configUpdates) {
    const { error } = await supabase
      .from('app_config')
      .upsert({
        key: config.key,
        value: config.value,
        description: config.description,
        updated_at: config.updated_at,
      }, {
        onConflict: 'key'
      })

    if (error) {
      console.error(`Failed to update config ${config.key}:`, error)
      throw new Error(`Failed to update configuration: ${error.message}`)
    }
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('config_update', {
    updates,
    updated_keys: Object.keys(updates)
  })

  // Return updated config
  return await getAppConfig()
}

export async function resetAppConfig(): Promise<ConfigValue> {
  const supabase = await supabaseServer()
  
  // Delete all existing configs
  const { error: deleteError } = await supabase
    .from('app_config')
    .delete()
    .neq('id', '') // Delete all rows

  if (deleteError) {
    console.error('Failed to reset config:', deleteError)
    throw new Error(`Failed to reset configuration: ${deleteError.message}`)
  }

  // Insert default configs
  const defaultConfigs = Object.entries(DEFAULT_CONFIG).map(([key, value]) => ({
    key,
    value: String(value),
    description: getConfigDescription(key),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  const { error: insertError } = await supabase
    .from('app_config')
    .insert(defaultConfigs)

  if (insertError) {
    console.error('Failed to insert default config:', insertError)
    throw new Error(`Failed to reset configuration: ${insertError.message}`)
  }

  // Invalidate cache
  await bumpNamespaceVersion()

  // Log audit
  await logAdminAction('config_reset', {
    default_config: DEFAULT_CONFIG
  })

  return DEFAULT_CONFIG
}

function getConfigDescription(key: string): string {
  const descriptions: Record<string, string> = {
    plus_ones_enabled: 'Enable or disable plus-one functionality across the site',
    max_party_size: 'Maximum number of people allowed per invitation (including the main guest)',
    allow_guest_plus_ones: 'Allow guests to specify plus-ones when RSVPing',
  }
  return descriptions[key] || 'Application configuration setting'
}

// Helper function to check if plus-ones are enabled
export async function isPlusOnesEnabled(): Promise<boolean> {
  const config = await getAppConfig()
  return config.plus_ones_enabled
}

// Helper function to get max party size
export async function getMaxPartySize(): Promise<number> {
  const config = await getAppConfig()
  return config.max_party_size
}

// Helper function to check if guests can specify plus-ones
export async function canGuestsSpecifyPlusOnes(): Promise<boolean> {
  const config = await getAppConfig()
  return config.plus_ones_enabled && config.allow_guest_plus_ones
}
