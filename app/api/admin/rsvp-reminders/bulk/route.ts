import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { sendBulkRsvpRemindersAction } from '@/lib/actions/rsvp-reminders'
import { requireWeddingId } from '@/lib/api-wedding-context'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/rsvp-reminders/bulk
 * Send urgent RSVP reminders to all guests who haven't responded
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
    const { eventIds, ignoreRateLimit } = body

    // Verify events belong to this wedding if provided
    if (eventIds && Array.isArray(eventIds) && eventIds.length > 0) {
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select('id, wedding_id')
        .in('id', eventIds)
        .eq('wedding_id', weddingId)

      if (eventsError) {
        return NextResponse.json(
          { success: false, error: 'Failed to verify events' },
          { status: 500 }
        )
      }

      const validEventIds = events?.map((e: { id: string; wedding_id: string }) => e.id) || []
      if (validEventIds.length !== eventIds.length) {
        return NextResponse.json(
          { success: false, error: 'Some events not found or access denied' },
          { status: 403 }
        )
      }
    }

    // Send bulk reminders (sendBulkRsvpRemindersAction already handles wedding_id internally)
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

