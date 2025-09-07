import { Redis as IORedis } from 'ioredis'
import { Redis as UpstashRedis } from '@upstash/redis'

export interface KVClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, ttlSec?: number): Promise<void>
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

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    try {
      if (ttlSec) {
        await this.client.setex(key, ttlSec, value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      console.warn('Redis Cloud set error:', error)
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

  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    try {
      if (ttlSec) {
        await this.client.setex(key, ttlSec, value)
      } else {
        await this.client.set(key, value)
      }
    } catch (error) {
      console.warn('Upstash set error:', error)
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
      console.warn('Upstash mget error:', error)
      return keys.map(() => null)
    }
  }
}

class NoOpClient implements KVClient {
  async get(_key: string): Promise<string | null> {
    return null
  }

  async set(_key: string, _value: string, _ttlSec?: number): Promise<void> {
    // No-op
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
    console.warn(`Cache disabled: CACHE_PROVIDER=${provider}`)
    kvClient = new NoOpClient()
    return kvClient
  }

  if (provider === 'redis') {
    const redisHost = process.env.REDIS_HOST
    const redisPort = parseInt(process.env.REDIS_PORT || '6379')
    const redisPassword = process.env.REDIS_PASSWORD
    const redisUsername = process.env.REDIS_USERNAME
    if (!redisHost || !redisPort) {
      console.warn('Redis Cloud selected but REDIS_HOST or REDIS_PORT not set, falling back to no-op')
      kvClient = new NoOpClient()
      return kvClient
    }
    kvClient = new RedisCloudClient(redisHost, redisPort, redisPassword, redisUsername)
    console.log(`Cache initialized: Redis Cloud (${namespace})`)
    return kvClient
  }

  if (provider === 'upstash') {
    const url = process.env.UPSTASH_REDIS_REST_URL
    const token = process.env.UPSTASH_REDIS_REST_TOKEN
    if (!url || !token) {
      console.warn('Upstash selected but UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set, falling back to no-op')
      kvClient = new NoOpClient()
      return kvClient
    }
    kvClient = new UpstashClient(url, token)
    console.log(`Cache initialized: Upstash (${namespace})`)
    return kvClient
  }

  console.warn(`Unknown cache provider: ${provider}, falling back to no-op`)
  kvClient = new NoOpClient()
  return kvClient
}
