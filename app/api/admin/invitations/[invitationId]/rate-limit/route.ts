import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const resolvedParams = await params
    const supabase = await supabaseServer()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      redirect('/auth/sign-in')
    }

    // Check admin/staff role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin' && profile?.role !== 'staff') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('eventId')

    // Get today's date range
    const today = new Date().toISOString().split('T')[0]
    const startOfDay = `${today}T00:00:00.000Z`
    const endOfDay = `${today}T23:59:59.999Z`

    // Get invitation token first (scoped to wedding)
    const { data: invitation } = await supabase
      .from('invitations')
      .select('token')
      .eq('id', resolvedParams.invitationId)
      .eq('wedding_id', weddingId)
      .single()

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Build query based on token (since mail_logs uses token field)
    let query = supabase
      .from('mail_logs')
      .select('*')
      .eq('token', invitation.token)
      .gte('sent_at', startOfDay)
      .lte('sent_at', endOfDay)

    const { data: mailLogs, error } = await query

    if (error) {
      console.error('Error fetching rate limit:', error)
      return NextResponse.json(
        { error: 'Failed to fetch rate limit data' },
        { status: 500 }
      )
    }

    const sentToday = mailLogs?.length || 0
    const maxPerDay = 3
    const remaining = Math.max(0, maxPerDay - sentToday)
    
    // Calculate when the rate limit window resets (next day at midnight)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(0, 0, 0, 0)
    const windowEndsAt = tomorrow.toISOString()

    return NextResponse.json({
      remaining,
      sentToday,
      maxPerDay,
      windowEndsAt,
      canSend: remaining > 0,
    })
  } catch (error) {
    console.error('Rate limit API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
