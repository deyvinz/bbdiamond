import { NextRequest, NextResponse } from 'next/server'
import { getWeddingContext } from '@/lib/wedding-context'

// GET - Fetch wedding info for client components
export async function GET(request: NextRequest) {
  try {
    const context = await getWeddingContext()
    
    if (!context) {
      return NextResponse.json({
        success: true,
        wedding: null
      })
    }

    return NextResponse.json({
      success: true,
      wedding: {
        couple_display_name: context.wedding.couple_display_name,
        hashtag: context.wedding.hashtag,
        contact_email: context.wedding.contact_email
      }
    })
  } catch (error) {
    console.error('Error fetching wedding info:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

