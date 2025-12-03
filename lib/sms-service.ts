/**
 * SMS Service for sending invitations via Twilio SMS/RCS
 */

import type { SmsResult, InvitationNotificationParams } from './types/notifications'

export interface SendSmsOptions {
  to: string
  body: string
  useRcs?: boolean
}

/**
 * Format phone number to E.164 format for Twilio
 * E.164 format: +[country code][number] (e.g., +1234567890)
 */
export function formatPhoneForTwilio(phone: string, defaultCountryCode: string = '+1'): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.trim()

  // If already in E.164 format, return as-is
  if (/^\+[1-9]\d{1,14}$/.test(cleaned)) {
    return cleaned
  }

  // Extract only digits
  const digits = cleaned.replace(/\D/g, '')

  // If the number starts with the country code digits (without +), add the +
  const countryDigits = defaultCountryCode.replace(/\D/g, '')
  if (digits.startsWith(countryDigits)) {
    return `+${digits}`
  }

  // Otherwise, prepend the default country code
  return `${defaultCountryCode}${digits}`
}

/**
 * Validate phone number format (E.164)
 */
export function validatePhoneNumber(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/
  return e164Regex.test(phone.trim())
}

/**
 * Send an SMS message via Twilio
 * Note: This should be called from a server environment or edge function
 */
export async function sendSms(options: SendSmsOptions): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_PHONE_NUMBER
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID

  if (!accountSid || !authToken) {
    console.error('Twilio credentials not configured')
    return {
      success: false,
      error: 'Twilio API credentials not configured',
    }
  }

  if (!fromNumber && !messagingServiceSid) {
    console.error('Twilio phone number or messaging service not configured')
    return {
      success: false,
      error: 'Twilio sender not configured',
    }
  }

  try {
    // Build request body
    const formData = new URLSearchParams()
    formData.append('To', options.to)
    formData.append('Body', options.body)

    // Use messaging service for RCS capability, otherwise use phone number
    if (options.useRcs && messagingServiceSid) {
      formData.append('MessagingServiceSid', messagingServiceSid)
    } else if (fromNumber) {
      formData.append('From', fromNumber)
    } else if (messagingServiceSid) {
      formData.append('MessagingServiceSid', messagingServiceSid)
    }

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
      console.error('Twilio API error:', data)
      return {
        success: false,
        error: data.message || `Twilio API error: ${response.status}`,
      }
    }

    return {
      success: true,
      messageId: data.sid,
    }
  } catch (error) {
    console.error('Error sending SMS:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Format invitation content for SMS
 * Keeps message under 160 characters when possible for single SMS segment
 */
export function formatInvitationSmsMessage(params: InvitationNotificationParams): string {
  // Short format for SMS to minimize message segments
  const message = [
    `Hi ${params.guestFirstName}!`,
    `You're invited to ${params.coupleName}'s ${params.eventName}`,
    `${params.eventDate} at ${params.eventTime}`,
    `${params.venue}`,
    `RSVP: ${params.rsvpUrl}`,
    `Code: ${params.inviteCode}`,
  ].join('\n')

  return message
}

/**
 * Send an invitation SMS
 */
export async function sendInvitationSms(params: InvitationNotificationParams & { phoneNumber: string }): Promise<SmsResult> {
  const formattedPhone = formatPhoneForTwilio(params.phoneNumber)

  if (!validatePhoneNumber(formattedPhone)) {
    return {
      success: false,
      error: `Invalid phone number format: ${params.phoneNumber}`,
    }
  }

  const messageBody = formatInvitationSmsMessage(params)

  return sendSms({
    to: formattedPhone,
    body: messageBody,
  })
}
