import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { findDuplicateEmails, cleanupDuplicateEmails } from '@/lib/guests-service-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/guests/duplicates
 * Find duplicate email addresses in the guests table
 */
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const duplicates = await findDuplicateEmails(weddingId)

    return NextResponse.json({
      success: true,
      duplicates,
      count: duplicates.length,
      totalDuplicateGuests: duplicates.reduce((sum, d) => sum + d.count - 1, 0)
    })
  } catch (error) {
    console.error('Error finding duplicate emails:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find duplicates',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/guests/duplicates/cleanup
 * Remove duplicate email addresses from the guests table
 */
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Parse request body
    const body = await request.json().catch(() => ({}))
    const dryRun = body.dryRun ?? false

    const result = await cleanupDuplicateEmails(dryRun, weddingId)

    return NextResponse.json({
      success: true,
      dryRun,
      ...result
    })
  } catch (error) {
    console.error('Error cleaning up duplicate emails:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup duplicates',
      },
      { status: 500 }
    )
  }
}

