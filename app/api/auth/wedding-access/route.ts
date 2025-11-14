import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { verifyWeddingOwnership, getUserWeddings } from '@/lib/auth/wedding-access'

export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { hasAccess: false, weddings: [], error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { weddingId } = body

    if (!weddingId) {
      // If no wedding ID provided, return all weddings owned by user
      const weddings = await getUserWeddings(user.id)
      return NextResponse.json({
        hasAccess: false, // Can't determine access without wedding ID
        weddings,
      })
    }

    // Check if user owns the specific wedding
    const hasAccess = await verifyWeddingOwnership(user.id, weddingId)
    const weddings = await getUserWeddings(user.id)

    return NextResponse.json({
      hasAccess,
      weddings,
    })
  } catch (error) {
    console.error('Error checking wedding access:', error)
    return NextResponse.json(
      { hasAccess: false, weddings: [], error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { hasAccess: false, weddings: [], error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Return all weddings owned by user
    const weddings = await getUserWeddings(user.id)

    return NextResponse.json({
      hasAccess: false, // Can't determine access without wedding ID
      weddings,
    })
  } catch (error) {
    console.error('Error getting user weddings:', error)
    return NextResponse.json(
      { hasAccess: false, weddings: [], error: 'Internal server error' },
      { status: 500 }
    )
  }
}

