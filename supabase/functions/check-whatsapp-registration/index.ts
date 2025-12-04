import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioWhatsappFromNumber = Deno.env.get('TWILIO_WHATSAPP_FROM_NUMBER')

    if (!twilioAccountSid || !twilioAuthToken || !twilioWhatsappFromNumber) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Twilio WhatsApp credentials not configured',
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

    // Twilio doesn't provide a direct registration check API
    // The registration status will be determined when sending messages
    // Twilio will return appropriate error codes if the number is not registered
    // For now, we'll assume registered if credentials are configured
    // The actual registration will be verified when sending messages via delivery status webhooks

    return new Response(
      JSON.stringify({
        success: true,
        isRegistered: true, // Assume registered if Twilio is configured
        waId: payload.phoneNumber,
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
