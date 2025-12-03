import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const WHATSAPP_API_VERSION = 'v21.0'

interface CheckRegistrationPayload {
  phoneNumber: string
}

interface CheckRegistrationResponse {
  success: boolean
  isRegistered?: boolean
  waId?: string
  error?: string
}

serve(async (req) => {
  try {
    // Get environment variables
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')

    if (!whatsappAccessToken || !whatsappPhoneNumberId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'WhatsApp credentials not configured',
        } as CheckRegistrationResponse),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const payload: CheckRegistrationPayload = await req.json()

    if (!payload.phoneNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Phone number is required',
        } as CheckRegistrationResponse),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Call Meta Graph API to check contact registration
    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${whatsappPhoneNumberId}/contacts`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${whatsappAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          blocking: 'wait',
          contacts: [payload.phoneNumber],
          force_check: true,
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp contacts API error:', data)
      return new Response(
        JSON.stringify({
          success: false,
          error: data.error?.message || `WhatsApp API error: ${response.status}`,
        } as CheckRegistrationResponse),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse response - contact status is 'valid' if registered
    const contact = data.contacts?.[0]
    const isRegistered = contact?.status === 'valid'
    const waId = contact?.wa_id

    return new Response(
      JSON.stringify({
        success: true,
        isRegistered,
        waId,
      } as CheckRegistrationResponse),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in check-whatsapp-registration:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as CheckRegistrationResponse),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
