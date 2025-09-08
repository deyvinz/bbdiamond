

import { getKVClient } from './kv'

const DEBUG = process.env.NODE_ENV !== 'production' || process.env.CACHE_DEBUG === 'true'

function debugLog(message: string, ...args: unknown[]) {
  if (DEBUG) {
    console.log(`[CACHE] ${message}`, ...args)
  }
}

const namespace = process.env.CACHE_NAMESPACE || 'wg'
let versionCache: { value: string; expires: number } | null = null
const VERSION_CACHE_TTL = 5000 // 5 seconds

export function withJitter(ttlSec: number, jitterSec: number = 20): number {
  const jitter = Math.floor(Math.random() * (jitterSec * 2 + 1)) - jitterSec
  const result = Math.max(30, ttlSec + jitter) // Minimum 30 seconds
  debugLog(`TTL with jitter: ${ttlSec}s + ${jitter}s = ${result}s`)
  return result
}

export async function keyVersion(): Promise<string> {
  // Check in-memory cache first
  if (versionCache && Date.now() < versionCache.expires) {
    return versionCache.value
  }

  const kv = getKVClient()
  const versionKey = `${namespace}:version`
  
  try {
    const version = await kv.get(versionKey)
    const versionValue = version || '1'
    
    // Cache in memory for 5 seconds
    versionCache = {
      value: versionValue,
      expires: Date.now() + VERSION_CACHE_TTL
    }
    
    debugLog(`Version: ${versionValue}`)
    return versionValue
  } catch (error) {
    debugLog('Failed to get version, using default', error)
    return '1'
  }
}

export async function cacheJson<T>(
  keyBase: string,
  ttlSec: number,
  fetcher: () => Promise<T>
): Promise<T> {
  const version = await keyVersion()
  const fullKey = `${namespace}:v${version}:${keyBase}`
  
  const kv = getKVClient()
  
  try {
    // Try to get from cache
    const cached = await kv.get(fullKey)
    if (cached) {
      debugLog(`Cache HIT: ${keyBase}`)
      return JSON.parse(cached) as T
    }
    
    debugLog(`Cache MISS: ${keyBase}`)
    
    // Fetch fresh data
    const data = await fetcher()
    
    // Store in cache with jitter
    const jitteredTtl = withJitter(ttlSec)
    const serialized = JSON.stringify(data)
    await kv.set(fullKey, serialized, jitteredTtl)
    
    debugLog(`Cache SET: ${keyBase} (TTL: ${jitteredTtl}s)`)
    return data
  } catch (error) {
    debugLog(`Cache error for ${keyBase}, falling back to fetcher`, error)
    return await fetcher()
  }
}

export async function invalidateKeys(...keyBases: string[]): Promise<void> {
  if (keyBases.length === 0) return
  
  const version = await keyVersion()
  const keys = keyBases.map(base => `${namespace}:v${version}:${base}`)
  
  const kv = getKVClient()
  
  try {
    const deleted = await kv.del(...keys)
    debugLog(`Invalidated ${deleted} keys:`, keyBases)
  } catch (error) {
    debugLog('Failed to invalidate keys', error)
  }
}

export async function bumpNamespaceVersion(): Promise<string> {
  const kv = getKVClient()
  const versionKey = `${namespace}:version`
  
  try {
    // Get current version
    const current = await kv.get(versionKey)
    const currentVersion = current ? parseInt(current, 10) : 1
    const newVersion = (currentVersion + 1).toString()
    
    // Set new version
    await kv.set(versionKey, newVersion)
    
    // Clear in-memory cache
    versionCache = null
    
    debugLog(`Version bumped: ${currentVersion} → ${newVersion}`)
    return newVersion
  } catch (error) {
    debugLog('Failed to bump version', error)
    // Fallback: clear in-memory cache to force refresh
    versionCache = null
    return '1'
  }
}

export function getCacheConfig() {
  return {
    namespace,
    provider: process.env.CACHE_PROVIDER || 'disabled',
    guestsTtl: parseInt(process.env.CACHE_GUESTS_TTL_SECONDS || '120', 10),
    jitterSec: parseInt(process.env.CACHE_JITTER_SECONDS || '20', 10),
  }
}
