import { NextRequest, NextResponse } from 'next/server'
import { getAppConfig, updateAppConfig, resetAppConfig } from '@/lib/config-service'
import { updateConfigSchema } from '@/lib/validators'
import { requireWeddingId, getWeddingIdFromBody } from '@/lib/api-wedding-context'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const config = await getAppConfig(weddingId)
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching config:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch configuration'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = updateConfigSchema.parse(body)
    
    const weddingId = getWeddingIdFromBody(body) || await requireWeddingId(request)
    const config = await updateAppConfig(validatedData, weddingId)
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating config:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }
    
    const message = error instanceof Error ? error.message : 'Failed to update configuration'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'reset') {
      const weddingId = await requireWeddingId(request)
      const config = await resetAppConfig(weddingId)
      return NextResponse.json(config)
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error resetting config:', error)
    const message = error instanceof Error ? error.message : 'Failed to reset configuration'
    const status = message.includes('Wedding ID') ? 400 : 500
    return NextResponse.json(
      { error: message },
      { status }
    )
  }
}
