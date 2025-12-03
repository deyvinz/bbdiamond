import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  findDuplicateHouseholds,
  findOrphanedHouseholds,
  cleanupHouseholds
} from '@/lib/guests-service-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/guests/households
 * Find duplicate and orphaned households
 */
export async function GET(request: NextRequest) {
  try {
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

    const duplicates = await findDuplicateHouseholds()
    const orphaned = await findOrphanedHouseholds()

    return NextResponse.json({
      success: true,
      duplicates,
      orphaned,
      totalDuplicates: duplicates.reduce((sum, d) => sum + d.count - 1, 0),
      totalOrphaned: orphaned.length
    })
  } catch (error) {
    console.error('Error finding duplicate/orphaned households:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to find households',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/guests/households
 * Cleanup duplicate and orphaned households
 */
export async function POST(request: NextRequest) {
  try {
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

    const result = await cleanupHouseholds(dryRun)

    return NextResponse.json({
      success: true,
      dryRun,
      ...result
    })
  } catch (error) {
    console.error('Error cleaning up households:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cleanup households',
      },
      { status: 500 }
    )
  }
}

