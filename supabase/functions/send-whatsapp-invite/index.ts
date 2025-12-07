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
    const twilioWhatsappContentSid = Deno.env.get('TWILIO_WHATSAPP_CONTENT_SID')
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

    // Parse and validate payload
    let payload: WhatsAppInvitePayload
    try {
      payload = await req.json()
    } catch (parseError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Invalid JSON payload', 
          details: parseError instanceof Error ? parseError.message : 'Unknown parsing error'
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate required fields
    if (!payload.invitationId || !payload.weddingId || !payload.eventIds || !payload.phoneNumber || 
        !payload.guestName || !payload.coupleName || !payload.eventName || !payload.eventDate || 
        !payload.eventTime || !payload.venue || !payload.rsvpUrl || !payload.inviteCode) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields. Required: invitationId, weddingId, eventIds, phoneNumber, guestName, coupleName, eventName, eventDate, eventTime, venue, rsvpUrl, inviteCode' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Helper function to sanitize variables for Twilio
    // Handles all whitespace variants and special characters
    const sanitizeVariable = (value: string): string => {
      if (!value || typeof value !== 'string') return ''
      
      let sanitized = value
        // Replace all types of newlines
        .replace(/\r\n/g, ' ')
        .replace(/[\n\r]/g, ' ')
        // Replace tabs
        .replace(/\t/g, ' ')
        // Replace non-breaking spaces and other Unicode whitespace
        .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')
        // Replace any 2+ consecutive spaces with single space
        .replace(/ {2,}/g, ' ')
        // Remove any control characters
        .replace(/[\x00-\x1F\x7F]/g, '')
        // Trim
        .trim()
      
      return sanitized || ''
    }

    // Format content variables for Twilio WhatsApp template
    const var1 = sanitizeVariable(payload.guestName)
    const var2 = sanitizeVariable(`${payload.coupleName}'s ${payload.eventName}`)
    const var3 = sanitizeVariable(`${payload.eventDate} at ${payload.eventTime} · ${payload.venue}`)
    const var4 = sanitizeVariable(payload.rsvpUrl)  // Just the URL, no invite code

    // Log variables for debugging
    console.log('ContentVariables being sent:', { var1, var2, var3, var4 })

    // Validate that no variables are empty after sanitization
    if (!var1 || !var2 || !var3 || !var4) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'One or more required variables are empty after sanitization',
          details: { 
            var1: var1 || '(empty)', 
            var2: var2 || '(empty)', 
            var3: var3 || '(empty)', 
            var4: var4 || '(empty)' 
          }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const contentVariables = JSON.stringify({
      '1': var1,
      '2': var2,
      '3': var3,
      '4': var4,
    })

    // Format phone numbers with whatsapp: prefix for Twilio
    const toNumber = payload.phoneNumber.startsWith('whatsapp:') 
      ? payload.phoneNumber 
      : `whatsapp:${payload.phoneNumber}`
    const fromNumber = twilioWhatsappFromNumber.startsWith('whatsapp:') 
      ? twilioWhatsappFromNumber 
      : `whatsapp:${twilioWhatsappFromNumber}`

    // Build Twilio request
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
