/**
 * WhatsApp Service for sending invitations via Meta WhatsApp Business API
 * Uses the Cloud API free tier (1,000 free conversations per month)
 */

const WHATSAPP_API_VERSION = 'v21.0' // Update as needed

interface WhatsAppMessageParams {
  to: string // Phone number in E.164 format (e.g., +1234567890)
  templateName: string
  templateParams: Record<string, string>
  languageCode?: string
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a WhatsApp template message using Meta WhatsApp Business API
 * Templates must be pre-approved in Meta Business Manager
 */
export async function sendWhatsAppTemplate(params: WhatsAppMessageParams): Promise<WhatsAppResponse> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

  if (!accessToken || !phoneNumberId) {
    console.error('WhatsApp credentials not configured')
    return {
      success: false,
      error: 'WhatsApp API credentials not configured',
    }
  }

  try {
    // Format template parameters for WhatsApp API
    const components = []
    if (Object.keys(params.templateParams).length > 0) {
      components.push({
        type: 'body',
        parameters: Object.entries(params.templateParams).map(([key, value]) => ({
          type: 'text',
          text: value,
        })),
      })
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: params.to,
      type: 'template',
      template: {
        name: params.templateName,
        language: {
          code: params.languageCode || 'en',
        },
        ...(components.length > 0 && { components }),
      },
    }

    const response = await fetch(
      `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('WhatsApp API error:', data)
      return {
        success: false,
        error: data.error?.message || `WhatsApp API error: ${response.status}`,
      }
    }

    return {
      success: true,
      messageId: data.messages?.[0]?.id,
    }
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Format invitation content for WhatsApp
 * Keeps message shorter than email version to stay within WhatsApp limits
 */
export function formatInvitationMessage(params: {
  guestName: string
  coupleName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  rsvpUrl: string
  inviteCode: string
}): Record<string, string> {
  // WhatsApp template parameters (must match approved template)
  return {
    guest_name: params.guestName,
    couple_name: params.coupleName,
    event_name: params.eventName,
    event_date: params.eventDate,
    event_time: params.eventTime,
    venue: params.venue,
    rsvp_url: params.rsvpUrl,
    invite_code: params.inviteCode,
  }
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhoneNumber(phone: string): boolean {
  // E.164 format: +[country code][number] (e.g., +1234567890)
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone.trim())
}

/**
 * Format phone number to E.164 format (basic implementation)
 * Note: This is a simple formatter. For production, consider using a library like libphonenumber-js
 */
export function formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If already starts with +, return as-is
  if (phone.trim().startsWith('+')) {
    return phone.trim()
  }
  
  // Add country code if not present
  const countryCodeDigits = countryCode.replace(/\D/g, '')
  if (!digits.startsWith(countryCodeDigits)) {
    return `${countryCode}${digits}`
  }
  
  return `+${digits}`
}

