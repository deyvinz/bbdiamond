import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface WhatsAppInvitePayload {
  invitationId: string
  weddingId: string
  eventIds: string[]
  phoneNumber: string
  guestName: string
  coupleName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  address?: string
  rsvpUrl: string
  inviteCode: string
}

serve(async (req) => {
  try {
    // Get environment variables
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsappFromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM_NUMBER')
    const twilioWhatsappContentSid = Deno.env.get('TWILIO_WHATSAPP_CONTENT_SID') // Content SID for WhatsApp template
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!twilioAccountSid || !twilioAuthToken) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!twilioWhatsappFromNumber) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio WhatsApp sender number not configured. Set TWILIO_WHATSAPP_FROM_NUMBER' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!twilioWhatsappContentSid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Twilio WhatsApp Content SID not configured. Set TWILIO_WHATSAPP_CONTENT_SID. You need to create a WhatsApp template in Twilio Content API.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: WhatsAppInvitePayload = await req.json()

    // Format content variables for Twilio WhatsApp template
    // Reduced to 4 variables to meet WhatsApp's variable-to-length ratio requirement
    // These variables will be substituted in your Twilio Content template
    const contentVariables = JSON.stringify({
      '1': payload.guestName, // Variable 1: Guest name
      '2': `${payload.coupleName}'s ${payload.eventName}`, // Variable 2: Couple name + Event name (combined)
      '3': `${payload.eventDate} at ${payload.eventTime} · ${payload.venue}`, // Variable 3: Date, time, and venue (combined)
      '4': `${payload.rsvpUrl}\nCode: ${payload.inviteCode}`, // Variable 4: RSVP URL and invite code (combined)
    })

    // Format phone numbers with whatsapp: prefix for Twilio
    const toNumber = payload.phoneNumber.startsWith('whatsapp:') 
      ? payload.phoneNumber 
      : `whatsapp:${payload.phoneNumber}`
    const fromNumber = twilioWhatsappFromNumber.startsWith('whatsapp:') 
      ? twilioWhatsappFromNumber 
      : `whatsapp:${twilioWhatsappFromNumber}`

    // Build Twilio request - use ContentSid for templates (required outside 24-hour window)
    const formData = new URLSearchParams()
    formData.append('To', toNumber)
    formData.append('From', fromNumber)
    formData.append('ContentSid', twilioWhatsappContentSid)
    formData.append('ContentVariables', contentVariables)

    // Send WhatsApp message via Twilio API
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
      console.error('Twilio WhatsApp API error:', data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.message || `Twilio WhatsApp API error: ${response.status}`,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update invitation record
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase
      .from('invitations')
      .update({ 
        whatsapp_sent_at: new Date().toISOString(),
        whatsapp_message_id: data.sid,
      })
      .eq('id', payload.invitationId)

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.sid,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in send-whatsapp-invite:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

