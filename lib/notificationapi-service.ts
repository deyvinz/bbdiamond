/**
 * NotificationAPI Service
 * Unified notification delivery through NotificationAPI platform
 * Replaces individual channel services (email, SMS, WhatsApp)
 *
 * Documentation: https://www.notificationapi.com/docs/integrations/supabase
 */

import { supabaseServer } from './supabase-server'
import { getWeddingId } from './wedding-context-server'

// NotificationAPI SDK types
interface NotificationAPIUser {
  id: string
  email?: string
  number?: string // Phone number in E.164 format
}

interface NotificationAPISendRequest {
  notificationId: string
  user: NotificationAPIUser
  mergeTags?: Record<string, string>
}

interface NotificationAPISendResponse {
  success: boolean
  id?: string
  error?: string
}

// Application notification types
export type NotificationType =
  | 'wedding_invitation'
  | 'rsvp_confirmation'
  | 'rsvp_reminder'
  | 'announcement'
  | 'qr_code_email'

// Supported notification channels
export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'inapp'

export interface SendNotificationParams {
  type: NotificationType
  userId: string
  email?: string
  phone?: string
  parameters: Record<string, string>
  weddingId?: string
  /** Specific channel to use. If not provided, NotificationAPI decides based on available contact info */
  channel?: NotificationChannel
}

export interface NotificationAPIResult {
  success: boolean
  notificationApiId?: string
  error?: string
}

/**
 * Initialize NotificationAPI SDK
 * Uses environment variables for credentials
 */
function getNotificationAPICredentials() {
  const clientId = process.env.NOTIFICATIONAPI_CLIENT_ID
  const clientSecret = process.env.NOTIFICATIONAPI_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error('NotificationAPI credentials not configured. Set NOTIFICATIONAPI_CLIENT_ID and NOTIFICATIONAPI_CLIENT_SECRET environment variables.')
  }

  return { clientId, clientSecret }
}

/**
 * Map notification type to template ID
 * Template IDs correspond to templates in NotificationAPI dashboard
 */
function getTemplateIdForNotificationType(type: NotificationType): string {
  const templateMap: Record<NotificationType, string> = {
    wedding_invitation: 'wedding_invitation',
    rsvp_confirmation: 'rsvp_confirmation',
    rsvp_reminder: 'rsvp_reminder',
    announcement: 'announcement',
    qr_code_email: 'qr_code_email',
  }
  return templateMap[type] || type
}

/**
 * Send notification via NotificationAPI
 * This calls a Supabase Edge Function that handles the actual API call
 * to keep the secret server-side only
 */
export async function sendNotification(params: SendNotificationParams): Promise<NotificationAPIResult> {
  const { type, userId, email, phone, parameters, weddingId, channel } = params

  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  // Only include contact info for the selected channel
  let effectiveEmail = email
  let effectivePhone = phone

  if (channel) {
    // If a specific channel is requested, only pass the relevant contact info
    if (channel === 'email') {
      effectivePhone = undefined
    } else if (channel === 'sms' || channel === 'whatsapp') {
      effectiveEmail = undefined
    }
  }

  // Get template ID for this notification type
  const templateId = getTemplateIdForNotificationType(type)

  try {
    // Call the Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('send-notification', {
      body: {
        notificationType: type,
        userId,
        email: effectiveEmail,
        phone: effectivePhone,
        parameters,
        channel, // Pass channel preference to edge function
        templateId, // Always include template ID
      },
    })

    if (error) {
      console.error('NotificationAPI Edge Function error:', error)
      
      // Try to extract more details from the error response
      let errorMessage = error.message || 'Failed to send notification'
      
      // FunctionsHttpError contains the response context
      if (error.context && typeof error.context.json === 'function') {
        try {
          const errorBody = await error.context.json()
          console.error('NotificationAPI Edge Function error body:', errorBody)
          errorMessage = errorBody?.error || errorBody?.message || errorMessage
        } catch {
          // Could not parse error body
        }
      }
      
      return {
        success: false,
        error: errorMessage,
      }
    }

    // Log to notification_logs table
    if (resolvedWeddingId) {
      await logNotification({
        weddingId: resolvedWeddingId,
        notificationType: type,
        recipientId: userId,
        recipientEmail: email,
        recipientPhone: phone,
        parameters,
        success: data?.success ?? false,
        notificationApiId: data?.result?.id,
        error: data?.error,
      })
    }

    return {
      success: data?.success ?? false,
      notificationApiId: data?.result?.id,
      error: data?.error,
    }
  } catch (error) {
    console.error('NotificationAPI send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send notification via direct API call (for use in Edge Functions)
 * This bypasses the Supabase function and calls NotificationAPI directly
 */
export async function sendNotificationDirect(
  params: SendNotificationParams,
  credentials: { clientId: string; clientSecret: string }
): Promise<NotificationAPIResult> {
  const { type, userId, email, phone, parameters } = params
  const { clientId, clientSecret } = credentials

  try {
    const response = await fetch('https://api.notificationapi.com/v1/sender/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: JSON.stringify({
        notificationId: process.env.NOTIFICATION_ID || 'shivenk_invitations',
        user: {
          id: userId,
          email,
          number: phone,
        },
        mergeTags: parameters,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        success: false,
        error: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const data = await response.json()
    return {
      success: true,
      notificationApiId: data.id,
    }
  } catch (error) {
    console.error('NotificationAPI direct send error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send bulk notifications to multiple recipients
 */
export async function sendBulkNotifications(
  type: NotificationType,
  recipients: Array<{
    userId: string
    email?: string
    phone?: string
    parameters: Record<string, string>
  }>,
  weddingId?: string
): Promise<NotificationAPIResult[]> {
  const results: NotificationAPIResult[] = []

  // Process in batches of 10 to avoid overwhelming the API
  const batchSize = 10
  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(recipient =>
        sendNotification({
          type,
          weddingId,
          ...recipient,
        })
      )
    )

    results.push(...batchResults)
  }

  return results
}

/**
 * Log notification to database for tracking
 */
async function logNotification(params: {
  weddingId: string
  notificationType: NotificationType
  recipientId: string
  recipientEmail?: string
  recipientPhone?: string
  parameters: Record<string, string>
  success: boolean
  notificationApiId?: string
  error?: string
}): Promise<void> {
  const supabase = await supabaseServer()

  const { error } = await supabase.from('notification_logs').insert({
    wedding_id: params.weddingId,
    notification_type: params.notificationType,
    recipient_id: params.recipientId,
    recipient_email: params.recipientEmail,
    recipient_phone: params.recipientPhone,
    parameters: params.parameters,
    status: params.success ? 'delivered' : 'failed',
    notificationapi_id: params.notificationApiId,
    error_message: params.error,
    delivered_at: params.success ? new Date().toISOString() : null,
  })

  if (error) {
    console.error('Failed to log notification:', error)
  }
}

/**
 * Theme parameters for dynamic branding in templates
 */
export interface ThemeParams {
  primaryColor?: string
  logoUrl?: string
  contactEmail?: string
}

/**
 * Map invitation parameters to NotificationAPI merge tags
 */
export function mapInvitationToMergeTags(params: {
  guestName: string
  guestFirstName: string
  coupleName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  address?: string
  rsvpUrl: string
  inviteCode: string
  websiteUrl: string
  theme?: ThemeParams
}): Record<string, string> {
  return {
    guestName: params.guestName,
    guestFirstName: params.guestFirstName,
    coupleName: params.coupleName,
    eventName: params.eventName,
    eventDate: params.eventDate,
    eventTime: params.eventTime,
    venueName: params.venue,
    venueAddress: params.address || '',
    rsvpUrl: params.rsvpUrl,
    inviteCode: params.inviteCode,
    websiteUrl: params.websiteUrl,
    // Theme/branding parameters
    primaryColor: params.theme?.primaryColor || '#C7A049',
    logoUrl: params.theme?.logoUrl || '',
    contactEmail: params.theme?.contactEmail || '',
  }
}

/**
 * Map RSVP confirmation parameters to NotificationAPI merge tags
 */
export function mapRsvpConfirmationToMergeTags(params: {
  guestName: string
  coupleName: string
  eventName: string
  rsvpStatus: string
  guestCount: number
  eventDate: string
  eventTime: string
  venue: string
  address?: string
  rsvpUrl: string
  websiteUrl: string
  theme?: ThemeParams
}): Record<string, string> {
  return {
    guestName: params.guestName,
    coupleName: params.coupleName,
    eventName: params.eventName,
    rsvpStatus: params.rsvpStatus,
    guestCount: params.guestCount.toString(),
    eventDate: params.eventDate,
    eventTime: params.eventTime,
    venueName: params.venue,
    venueAddress: params.address || '',
    rsvpUrl: params.rsvpUrl,
    websiteUrl: params.websiteUrl,
    // Theme/branding parameters
    primaryColor: params.theme?.primaryColor || '#C7A049',
    logoUrl: params.theme?.logoUrl || '',
    contactEmail: params.theme?.contactEmail || '',
  }
}

/**
 * Map announcement parameters to NotificationAPI merge tags
 */
export function mapAnnouncementToMergeTags(params: {
  guestName: string
  title: string
  content: string
  coupleName: string
  websiteUrl?: string
  theme?: ThemeParams
}): Record<string, string> {
  return {
    guestName: params.guestName,
    title: params.title,
    content: params.content,
    coupleName: params.coupleName,
    websiteUrl: params.websiteUrl || '',
    // Theme/branding parameters
    primaryColor: params.theme?.primaryColor || '#C7A049',
    logoUrl: params.theme?.logoUrl || '',
    contactEmail: params.theme?.contactEmail || '',
  }
}

/**
 * Fetch theme parameters for a wedding
 */
export async function getWeddingThemeParams(weddingId: string): Promise<ThemeParams> {
  const supabase = await supabaseServer()

  // Fetch email config and theme
  const [emailConfigResult, themeResult, weddingResult] = await Promise.all([
    supabase
      .from('wedding_email_config')
      .select('primary_color, logo_url, reply_to_email')
      .eq('wedding_id', weddingId)
      .single(),
    supabase
      .from('wedding_themes')
      .select('primary_color, logo_url, email_logo_url')
      .eq('wedding_id', weddingId)
      .single(),
    supabase
      .from('weddings')
      .select('contact_email')
      .eq('id', weddingId)
      .single(),
  ])

  const emailConfig = emailConfigResult.data
  const theme = themeResult.data
  const wedding = weddingResult.data

  return {
    primaryColor: emailConfig?.primary_color || theme?.primary_color || '#C7A049',
    logoUrl: emailConfig?.logo_url || theme?.email_logo_url || theme?.logo_url || '',
    contactEmail: emailConfig?.reply_to_email || wedding?.contact_email || '',
  }
}

/**
 * Check if NotificationAPI is configured
 */
export function isNotificationAPIConfigured(): boolean {
  return !!(
    process.env.NOTIFICATIONAPI_CLIENT_ID &&
    process.env.NOTIFICATIONAPI_CLIENT_SECRET
  )
}

/**
 * Get NotificationAPI configuration status
 */
export function getNotificationAPIStatus(): {
  configured: boolean
  clientIdSet: boolean
  clientSecretSet: boolean
} {
  return {
    configured: isNotificationAPIConfigured(),
    clientIdSet: !!process.env.NOTIFICATIONAPI_CLIENT_ID,
    clientSecretSet: !!process.env.NOTIFICATIONAPI_CLIENT_SECRET,
  }
}
