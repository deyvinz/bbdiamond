import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const WHATSAPP_API_VERSION = 'v21.0'

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
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      return new Response(
        JSON.stringify({ success: false, error: 'WhatsApp credentials not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: WhatsAppInvitePayload = await req.json()

    // Format template parameters
    const templateParams: Record<string, string> = {
      guest_name: payload.guestName,
      couple_name: payload.coupleName,
      event_name: payload.eventName,
      event_date: payload.eventDate,
      event_time: payload.eventTime,
      venue: payload.venue,
      rsvp_url: payload.rsvpUrl,
      invite_code: payload.inviteCode,
    }

    // Send WhatsApp message
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: payload.phoneNumber,
          type: 'template',
          template: {
            name: 'wedding_invitation',
            language: {
              code: 'en',
            },
            components: [
              {
                type: 'body',
                parameters: Object.entries(templateParams).map(([_, value]) => ({
                  type: 'text',
                  text: value,
                })),
              },
            ],
          },
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || `WhatsApp API error: ${response.status}`,
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Update invitation record
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    await supabase
      .from('invitations')
      .update({ whatsapp_sent_at: new Date().toISOString() })
      .eq('id', payload.invitationId)

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data.messages?.[0]?.id,
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

