import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import { supabaseServer } from '@/lib/supabase-server'
import { getEmailConfig, getWebsiteUrl } from '@/lib/email-service'
import { logAdminAction } from '@/lib/audit'
import { formatPhoneForTwilio, validatePhoneNumber } from '@/lib/sms-service'

export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const body = await request.json()
    const { invitationId, eventIds, phoneNumber, ignoreRateLimit } = body

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: 'Invitation ID is required' },
        { status: 400 }
      )
    }

    if (!eventIds || !Array.isArray(eventIds) || eventIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one event ID is required' },
        { status: 400 }
      )
    }

    if (!phoneNumber || !phoneNumber.trim()) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    const formattedPhone = formatPhoneForTwilio(phoneNumber.trim())
    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        guest:guests(first_name, last_name, invite_code),
        invitation_events(
          *,
          event:events(name, starts_at, venue, address)
        )
      `)
      .eq('id', invitationId)
      .eq('wedding_id', weddingId)
      .single()

    if (invitationError || !invitation) {
      return NextResponse.json(
        { success: false, error: 'Invitation not found' },
        { status: 404 }
      )
    }

    // Get selected events
    const selectedEvents = invitation.invitation_events?.filter((ie: any) =>
      eventIds.includes(ie.event_id)
    ) || []

    if (selectedEvents.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid events found for invitation' },
        { status: 400 }
      )
    }

    // Check rate limit (unless ignored)
    if (!ignoreRateLimit) {
      const today = new Date().toISOString().split('T')[0]
      const { data: smsLogs } = await supabase
        .from('mail_logs')
        .select('*')
        .eq('token', invitation.token)
        .eq('channel', 'sms')
        .gte('sent_at', `${today}T00:00:00.000Z`)

      if (smsLogs && smsLogs.length >= 3) {
        return NextResponse.json(
          { success: false, error: 'Daily SMS limit exceeded for this invitation' },
          { status: 429 }
        )
      }
    }

    // Get email config for branding
    const emailConfig = await getEmailConfig(weddingId)
    const websiteUrl = await getWebsiteUrl(weddingId)

    // Prepare SMS data
    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    const primaryEvent = selectedEvents[0]

    // Format event date and time
    const [datePart, timePart] = primaryEvent.event.starts_at.split(' ')
    const [year, month, day] = datePart.split('-')
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const eventTime = timePart ? timePart.substring(0, 5) : '00:00'

    const rsvpUrl = `${websiteUrl}/rsvp?token=${invitation.token}`
    const coupleName = emailConfig?.branding?.coupleDisplayName || 'The Couple'

    // Call edge function to send SMS
    const { data, error } = await supabase.functions.invoke('send-sms-invite', {
      body: {
        invitationId,
        weddingId,
        phoneNumber: formattedPhone,
        guestName,
        guestFirstName: invitation.guest.first_name,
        coupleName,
        eventName: primaryEvent.event.name,
        eventDate,
        eventTime,
        venue: primaryEvent.event.venue,
        rsvpUrl,
        inviteCode: invitation.guest.invite_code,
      },
    })

    if (error) {
      console.error('SMS send error:', error)
      return NextResponse.json(
        { success: false, error: `Failed to send SMS: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data?.success) {
      return NextResponse.json(
        { success: false, error: data?.error || 'Failed to send SMS invitation' },
        { status: 500 }
      )
    }

    // Log audit
    await logAdminAction('invite_sms_send', {
      invitation_id: invitationId,
      phone_number: formattedPhone,
      message_id: data.messageId,
    })

    return NextResponse.json({
      success: true,
      message: 'SMS invitation sent successfully',
      messageId: data.messageId,
    })
  } catch (error) {
    console.error('Error in send SMS route:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
