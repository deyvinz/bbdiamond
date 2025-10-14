import { NextRequest, NextResponse } from 'next/server'
import { getAppConfig, updateAppConfig, resetAppConfig } from '@/lib/config-service'
import { updateConfigSchema } from '@/lib/validators'

export async function GET(request: NextRequest) {
  try {
    const config = await getAppConfig()
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error fetching config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = updateConfigSchema.parse(body)
    
    const config = await updateAppConfig(validatedData)
    
    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating config:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update configuration' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json()
    
    if (action === 'reset') {
      const config = await resetAppConfig()
      return NextResponse.json(config)
    }
    
    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error resetting config:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to reset configuration' },
      { status: 500 }
    )
  }
}
