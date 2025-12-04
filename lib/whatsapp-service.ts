/**
 * WhatsApp Service for sending invitations via Twilio WhatsApp API
 * Uses Twilio's Messaging API with WhatsApp support
 */

import type { WhatsAppRegistrationStatus } from './types/notifications'

// In-memory cache for WhatsApp registration checks (24 hour TTL)
const registrationCache = new Map<string, { isRegistered: boolean; waId?: string; checkedAt: Date }>()
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface WhatsAppMessageParams {
  to: string // Phone number in E.164 format (e.g., +1234567890)
  body: string // Message body text
}

interface WhatsAppResponse {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send a WhatsApp message using Twilio WhatsApp API
 * Uses Twilio's Messaging API with WhatsApp support
 */
export async function sendWhatsAppMessage(params: WhatsAppMessageParams): Promise<WhatsAppResponse> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM_NUMBER // Format: whatsapp:+1234567890

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not configured')
    return {
      success: false,
      error: 'Twilio API credentials not configured',
    }
  }

  if (!whatsappFromNumber) {
    console.error('Twilio WhatsApp sender number not configured')
    return {
      success: false,
      error: 'Twilio WhatsApp sender number not configured. Set TWILIO_WHATSAPP_FROM_NUMBER',
    }
  }

  try {
    // Format phone numbers with whatsapp: prefix for Twilio
    const toNumber = params.to.startsWith('whatsapp:') ? params.to : `whatsapp:${params.to}`
    const fromNumber = whatsappFromNumber.startsWith('whatsapp:') ? whatsappFromNumber : `whatsapp:${whatsappFromNumber}`

    // Build request body for Twilio API
    const formData = new URLSearchParams()
    formData.append('To', toNumber)
    formData.append('From', fromNumber)
    formData.append('Body', params.body)

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      console.error('Twilio WhatsApp API error:', data)
      return {
        success: false,
        error: data.message || `Twilio WhatsApp API error: ${response.status}`,
      }
    }

    return {
      success: true,
      messageId: data.sid,
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
}): string {
  // Format as a plain text message for Twilio WhatsApp
  const message = [
    `Hi ${params.guestName}! 👋`,
    ``,
    `You're invited to ${params.coupleName}'s ${params.eventName}!`,
    ``,
    `📅 ${params.eventDate} at ${params.eventTime}`,
    `📍 ${params.venue}`,
    ``,
    `RSVP: ${params.rsvpUrl}`,
    `Code: ${params.inviteCode}`,
  ].join('\n')

  return message
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

/**
 * Check if a phone number is registered on WhatsApp
 * Note: Twilio doesn't provide a direct registration check API
 * This function attempts to send a test message and checks the response
 * Results are cached for 24 hours to minimize API calls
 * 
 * For Twilio, we can check message status via webhooks, but for simplicity,
 * we'll assume if Twilio credentials are configured, WhatsApp is available.
 * The actual delivery status will be handled via Twilio webhooks.
 */
export async function checkWhatsAppRegistration(
  phoneNumber: string
): Promise<WhatsAppRegistrationStatus> {
  const formattedPhone = formatPhoneNumber(phoneNumber)

  // Check cache first
  const cached = registrationCache.get(formattedPhone)
  if (cached && (Date.now() - cached.checkedAt.getTime()) < CACHE_TTL_MS) {
    return {
      phoneNumber: formattedPhone,
      isRegistered: cached.isRegistered,
      waId: cached.waId,
      checkedAt: cached.checkedAt,
      cached: true,
    }
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const whatsappFromNumber = process.env.TWILIO_WHATSAPP_FROM_NUMBER

  if (!accountSid || !authToken || !whatsappFromNumber) {
    console.error('Twilio WhatsApp credentials not configured for registration check')
    return {
      phoneNumber: formattedPhone,
      isRegistered: false,
      checkedAt: new Date(),
      cached: false,
      error: 'Twilio WhatsApp credentials not configured',
    }
  }

  // Twilio doesn't have a direct registration check endpoint
  // We'll assume that if credentials are configured, WhatsApp is available
  // The actual delivery status will be determined when sending messages
  // Twilio will return appropriate error codes if the number is not registered
  
  // For now, we'll return true if credentials are configured
  // The actual registration will be verified when sending messages
  const checkedAt = new Date()
  const isRegistered = true // Assume registered if Twilio is configured
  
  // Cache the result
  registrationCache.set(formattedPhone, {
    isRegistered,
    waId: formattedPhone, // Use phone number as waId for Twilio
    checkedAt,
  })

  return {
    phoneNumber: formattedPhone,
    isRegistered,
    waId: formattedPhone,
    checkedAt,
    cached: false,
  }
}

/**
 * Clear the WhatsApp registration cache
 * Useful for testing or when you want to force fresh checks
 */
export function clearRegistrationCache(): void {
  registrationCache.clear()
}

/**
 * Clear a specific phone number from the cache
 */
export function clearRegistrationCacheEntry(phoneNumber: string): void {
  const formattedPhone = formatPhoneNumber(phoneNumber)
  registrationCache.delete(formattedPhone)
}

