import { Redis as IORedis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'

export interface KVClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSec?: number): Promise<string>
  del(...keys: string[]): Promise<number>
  mget(keys: string[]): Promise<(string | null)[]>
}

class RedisCloudClient implements KVClient {
  private client: IORedis

  constructor(host: string, port: number, password: string = '', username: string = '') {
    this.client = new IORedis({
        host: host,
        port: port,
        password: password,
        username: username,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    })
  }

  async get(key: string): Promise<string | null> {
    try {
      return await this.client.get(key)
    } catch (error) {
      console.warn('Redis Cloud get error:', error)
      return null
    }
  }

  async set(key: string, value: string, ttlSec?: number): Promise<string> {
    try {
      if (ttlSec) {
        return await this.client.setex(key, ttlSec, value)
      } else {
        return await this.client.set(key, value)
      }
    } catch (error) {
      console.warn('Redis Cloud set error:', error)
      return 'ERROR'
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(...keys)
    } catch (error) {
      console.warn('Redis Cloud del error:', error)
      return 0
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      return await this.client.mget(...keys)
    } catch (error) {
      console.warn('Redis Cloud mget error:', error)
      return keys.map(() => null)
    }
  }
}

class UpstashClient implements KVClient {
  private client: UpstashRedis

  constructor(url: string, token: string) {
    this.client = new UpstashRedis({
      url,
      token,
    })
  }

  async get(key: string): Promise<string | null> {
    try {
      const result = await this.client.get(key)
      return result as string | null
    } catch (error) {
      console.warn('Upstash get error:', error)
      return null
    }
  }

  async set(key: string, value: string, ttlSec?: number): Promise<string> {
    try {
      if (ttlSec) {
        const result = await this.client.setex(key, ttlSec, value)
        return result || 'OK'
      } else {
        const result = await this.client.set(key, value)
        return result || 'OK'
      }
    } catch (error) {
      console.warn('Upstash set error:', error)
      return 'ERROR'
    }
  }

  async del(...keys: string[]): Promise<number> {
    try {
      return await this.client.del(...keys)
    } catch (error) {
      console.warn('Upstash del error:', error)
      return 0
    }
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    try {
      const results = await Promise.all(keys.map(key => this.client.get(key)))
      return results.map(r => r as string | null)
    } catch (error) {
      return keys.map(() => null)
    }
  }
}

class NoOpClient implements KVClient {
  async get(_key: string): Promise<string | null> {
    return null
  }

  async set(_key: string, _value: string, _ttlSec?: number): Promise<string> {
    // No-op
    return 'OK'
  }

  async del(..._keys: string[]): Promise<number> {
    return 0
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    return keys.map(() => null)
  }
}

let kvClient: KVClient | null = null

export function getKVClient(): KVClient {
  if (kvClient) {
    return kvClient
  }

  const provider = process.env.CACHE_PROVIDER
  const namespace = process.env.CACHE_NAMESPACE || 'wg'

  if (provider === 'disabled' || !provider) {
    kvClient = new NoOpClient()
    return kvClient
  }

  if (provider === 'redis') {
    const redisHost = process.env.REDIS_HOST
    const redisPort = parseInt(process.env.REDIS_PORT || '6379')
    const redisPassword = process.env.REDIS_PASSWORD
    const redisUsername = process.env.REDIS_USERNAME
    if (!redisHost || !redisPort) {
      kvClient = new NoOpClient()
      return kvClient
    }
    kvClient = new RedisCloudClient(redisHost, redisPort, redisPassword, redisUsername)
    return kvClient
  }

  if (provider === 'upstash') {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      kvClient = new NoOpClient()
      return kvClient
    }
    kvClient = new UpstashClient(url, token)
    return kvClient
  }

  kvClient = new NoOpClient()
  return kvClient
}

// Mutex helpers for distributed locking
export async function acquireLock(key: string, ttlSec: number = 300): Promise<boolean> {
  const kv = getKVClient()
  const lockKey = `${process.env.CACHE_NAMESPACE || 'wg'}:locks:${key}`
  const lockValue = `${Date.now()}-${Math.random()}`
  
  try {
    // Try to set the key only if it doesn't exist (NX) with expiration (EX)
    const result = await kv.set(lockKey, lockValue, ttlSec)
    return result === 'OK'
  } catch (error) {
    console.warn('Failed to acquire lock:', error)
    return false
  }
}

export async function releaseLock(key: string): Promise<void> {
  const kv = getKVClient()
  const lockKey = `${process.env.CACHE_NAMESPACE || 'wg'}:locks:${key}`
  
  try {
    await kv.del(lockKey)
  } catch (error) {
    console.warn('Failed to release lock:', error)
  }
}

export async function isLockHeld(key: string): Promise<boolean> {
  const kv = getKVClient()
  const lockKey = `${process.env.CACHE_NAMESPACE || 'wg'}:locks:${key}`
  
  try {
    const result = await kv.get(lockKey)
    return result !== null
  } catch (error) {
    console.warn('Failed to check lock status:', error)
    return false
  }
}
