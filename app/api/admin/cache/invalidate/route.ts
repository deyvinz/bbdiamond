import { NextRequest, NextResponse } from 'next/server'
import { bumpNamespaceVersion } from '@/lib/cache'

export async function POST(request: NextRequest) {
  try {
    // Invalidate the server-side cache
    await bumpNamespaceVersion()
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache invalidated successfully' 
    })
  } catch (error) {
    console.error('Cache invalidation error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to invalidate cache' 
      },
      { status: 500 }
    )
  }
}
