import { NextResponse } from 'next/server'
import { bumpNamespaceVersion } from '@/lib/cache'

export async function POST() {
  try {
    const newVersion = await bumpNamespaceVersion()
    
    return NextResponse.json({
      success: true,
      message: 'Cache cleared successfully',
      newVersion
    })
  } catch (error) {
    console.error('Error clearing cache:', error)
    return NextResponse.json(
      { error: 'Failed to clear cache' },
      { status: 500 }
    )
  }
}

