import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface SmsInvitePayload {
  invitationId: string
  weddingId: string
  phoneNumber: string
  guestName: string
  guestFirstName: string
  coupleName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  rsvpUrl: string
  inviteCode: string
}

serve(async (req) => {
  try {
    // Get environment variables
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER')
    const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!twilioPhoneNumber && !twilioMessagingServiceSid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio sender not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: SmsInvitePayload = await req.json()

    // Format SMS message (keeping it concise for SMS)
    const message = [
      `Hi ${payload.guestFirstName}!`,
      `You're invited to ${payload.coupleName}'s ${payload.eventName}`,
      `${payload.eventDate} at ${payload.eventTime}`,
      `${payload.venue}`,
      `RSVP: ${payload.rsvpUrl}`,
      `Code: ${payload.inviteCode}`,
    ].join('\n')

    // Build Twilio request
    const formData = new URLSearchParams()
    formData.append('To', payload.phoneNumber)
    formData.append('Body', message)

    // Use messaging service if available, otherwise use phone number
    if (twilioMessagingServiceSid) {
      formData.append('MessagingServiceSid', twilioMessagingServiceSid)
    } else if (twilioPhoneNumber) {
      formData.append('From', twilioPhoneNumber)
    }

    // Send SMS via Twilio API
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Twilio API error:', data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || `Twilio API error: ${response.status}`,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update invitation record with SMS sent timestamp
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase
      .from('invitations')
      .update({
        sms_sent_at: new Date().toISOString(),
        sms_message_id: data.sid,
      })
      .eq('id', payload.invitationId)

    // Log to mail_logs for tracking
    await supabase.from('mail_logs').insert({
      token: payload.invitationId, // Use invitation ID as token for tracking
      email: payload.phoneNumber, // Store phone number for SMS logs
      sent_at: new Date().toISOString(),
      success: true,
      channel: 'sms',
    })

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.sid,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-sms-invite:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
