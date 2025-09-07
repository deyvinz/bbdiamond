import { NextResponse } from 'next/server'
import { getKVClient } from '@/lib/kv'

export async function GET() {
  try {
    // Check Redis connection
    const kv = getKVClient()
    await kv.set('health-check', 'ok', 10)
    const result = await kv.get('health-check')
    
    if (result !== 'ok') {
      throw new Error('Redis health check failed')
    }

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: 'connected',
        app: 'running'
      }
    })
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
