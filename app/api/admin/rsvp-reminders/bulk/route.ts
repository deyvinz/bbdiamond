import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendBulkRsvpRemindersAction } from '@/lib/actions/rsvp-reminders'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/rsvp-reminders/bulk
 * Send urgent RSVP reminders to all guests who haven't responded
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
    const { eventIds, ignoreRateLimit } = body

    // Send bulk reminders
    const result = await sendBulkRsvpRemindersAction({
      eventIds,
      ignoreRateLimit: ignoreRateLimit ?? true, // Default to true for admin actions
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error in bulk RSVP reminders API:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send reminders',
      },
      { status: 500 }
    )
  }
}

