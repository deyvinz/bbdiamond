/**
 * Unified NotificationAPI Edge Function
 * Handles all notification delivery through NotificationAPI platform
 *
 * Replaces:
 * - send-whatsapp-invite
 * - send-sms-invite
 * - send-announcement-emails
 * - send-announcement-sms
 * - send-announcement-whatsapp
 * - send-rsvp-confirmation
 * - send-rsvp-reminder
 * - send-qr-email
 *
 * Documentation: https://www.notificationapi.com/docs/integrations/supabase
 *
 * Deploy: supabase functions deploy send-notification
 * Secrets:
 *   supabase secrets set NOTIFICATIONAPI_CLIENT_ID=your_client_id
 *   supabase secrets set NOTIFICATIONAPI_CLIENT_SECRET=your_client_secret
 *   supabase secrets set NOTIFICATION_ID=shivenk_invitations (optional, defaults to 'shivenk_invitations')
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import notificationapi from 'npm:notificationapi-node-server-sdk'

// Initialize NotificationAPI SDK (matching sample implementation)
const clientId = Deno.env.get('NOTIFICATIONAPI_CLIENT_ID')
const clientSecret = Deno.env.get('NOTIFICATIONAPI_CLIENT_SECRET')
const notificationId = Deno.env.get('NOTIFICATION_ID') || 'shivenk_invitations'

let sdkInitialized = false
if (clientId && clientSecret) {
  notificationapi.init(clientId, clientSecret)
  sdkInitialized = true
  console.log('[send-notification] NotificationAPI SDK initialized', { notificationId })
} else {
  console.warn('[send-notification] NotificationAPI credentials not found')
}

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Notification types
type NotificationType =
  | 'wedding_invitation'
  | 'rsvp_confirmation'
  | 'rsvp_reminder'
  | 'announcement'
  | 'qr_code_email'

// Supported channels
type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'inapp'

interface NotificationRequest {
  notificationType: NotificationType
  userId: string
  email?: string
  phone?: string
  parameters: Record<string, string>
  /** Specific channel to use */
  channel?: NotificationChannel
  /** Optional template ID (if different from notificationType) */
  templateId?: string
}

interface BulkNotificationRequest {
  notificationType: NotificationType
  recipients: Array<{
    userId: string
    email?: string
    phone?: string
    parameters: Record<string, string>
  }>
}

/**
 * Sanitize parameters for NotificationAPI
 * Removes newlines and control characters that could break templates
 */
function sanitizeParameters(params: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {}
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === 'string') {
      // Remove newlines, carriage returns, and control characters
      sanitized[key] = value
        .replace(/[\r\n]+/g, ' ')
        .replace(/[\x00-\x1F\x7F]/g, '')
        .trim()
    } else {
      sanitized[key] = String(value || '')
    }
  }
  return sanitized
}

/**
 * Map channel to NotificationAPI channel format
 */
function mapChannelToNotificationAPI(channel: NotificationChannel): string {
  switch (channel) {
    case 'email':
      return 'EMAIL'
    case 'sms':
      return 'SMS'
    case 'whatsapp':
      return 'WHATSAPP'
    case 'inapp':
      return 'INAPP_WEB'
    default:
      return 'EMAIL'
  }
}

/**
 * Map notification type to template ID
 * Template IDs correspond to templates in NotificationAPI dashboard
 */
function getTemplateId(notificationType: NotificationType): string {
  const templateMap: Record<NotificationType, string> = {
    wedding_invitation: 'wedding_invitation',
    rsvp_confirmation: 'rsvp_confirmation',
    rsvp_reminder: 'rsvp_reminder',
    announcement: 'announcement',
    qr_code_email: 'qr_code_email',
  }
  return templateMap[notificationType] || notificationType
}

/**
 * Send single notification via NotificationAPI
 * Based on: https://www.notificationapi.com/docs/integrations/supabase
 */
async function sendSingleNotification(request: NotificationRequest): Promise<{
  success: boolean
  error?: string
  channel?: string
}> {
  console.log('[sendSingleNotification] Starting', {
    notificationType: request.notificationType,
    templateId: request.templateId,
    userId: request.userId,
    hasEmail: !!request.email,
    hasPhone: !!request.phone,
    requestedChannel: request.channel,
    sdkInitialized,
  })

  if (!sdkInitialized) {
    const errorMsg = !clientId || !clientSecret 
      ? 'NotificationAPI credentials not configured. Set NOTIFICATIONAPI_CLIENT_ID and NOTIFICATIONAPI_CLIENT_SECRET secrets.'
      : 'NotificationAPI SDK failed to initialize'
    console.error('[sendSingleNotification]', errorMsg)
    return {
      success: false,
      error: errorMsg,
    }
  }

  try {
    const sanitizedParams = sanitizeParameters(request.parameters)

    // Build the send request exactly like the sample implementation:
    // await notificationapi.send({
    //   type: 'shivenk_invitations',  // From NOTIFICATION_ID env var
    //   to: { id, email, number },
    //   parameters: { ... },
    //   templateId: 'wedding_invitation'  // Specific template for this notification type
    // })
    const sendRequest: Record<string, unknown> = {
      type: notificationId,  // Use notification ID from environment
      to: {
        id: request.userId,
        email: request.email,
        number: request.phone,
      },
      parameters: sanitizedParams,
    }

    // Always include templateId - use provided one or map from notification type
    const templateId = request.templateId || getTemplateId(request.notificationType)
    sendRequest.templateId = templateId

    console.log('[sendSingleNotification] Calling notificationapi.send', {
      type: sendRequest.type,
      templateId: sendRequest.templateId,
      notificationType: request.notificationType,
      toId: (sendRequest.to as Record<string, unknown>)?.id,
      hasEmail: !!(sendRequest.to as Record<string, unknown>)?.email,
      hasPhone: !!(sendRequest.to as Record<string, unknown>)?.number,
      paramKeys: Object.keys(sanitizedParams),
    })

    // Call NotificationAPI - don't try to capture or stringify the result
    // as it may contain circular references
    await notificationapi.send(sendRequest)

    console.log('[sendSingleNotification] Success!')

    return {
      success: true,
      channel: request.channel,
    }
  } catch (error: unknown) {
    // Extract error message safely (avoid circular reference issues)
    let errorMessage = 'Unknown error from NotificationAPI'
    
    if (error instanceof Error) {
      errorMessage = error.message
    } else if (typeof error === 'string') {
      errorMessage = error
    } else if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>
      errorMessage = String(err.message || err.error || 'Unknown error')
    }
    
    console.error('[sendSingleNotification] Error:', errorMessage)
    
    return {
      success: false,
      error: errorMessage,
      channel: request.channel,
    }
  }
}

/**
 * Send bulk notifications via NotificationAPI
 */
async function sendBulkNotifications(request: BulkNotificationRequest): Promise<{
  success: boolean
  results: Array<{ userId: string; success: boolean; error?: string }>
  totalSent: number
  totalFailed: number
}> {
  const results: Array<{ userId: string; success: boolean; error?: string }> = []
  let totalSent = 0
  let totalFailed = 0

  // Process in batches of 10
  const batchSize = 10
  for (let i = 0; i < request.recipients.length; i += batchSize) {
    const batch = request.recipients.slice(i, i + batchSize)

    const batchResults = await Promise.all(
      batch.map(async (recipient) => {
        const result = await sendSingleNotification({
          notificationType: request.notificationType,
          ...recipient,
        })

        if (result.success) {
          totalSent++
        } else {
          totalFailed++
        }

        return {
          userId: recipient.userId,
          success: result.success,
          error: result.error,
        }
      })
    )

    results.push(...batchResults)
  }

  return {
    success: totalFailed === 0,
    results,
    totalSent,
    totalFailed,
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    })
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  try {
    const body = await req.json()
    console.log('[send-notification] Request received:', {
      notificationType: body.notificationType,
      templateId: body.templateId,
      userId: body.userId,
      hasEmail: !!body.email,
      hasPhone: !!body.phone,
      channel: body.channel,
      isBulk: !!(body.recipients && Array.isArray(body.recipients)),
    })

    // Check if bulk request
    if (body.recipients && Array.isArray(body.recipients)) {
      const bulkRequest: BulkNotificationRequest = {
        notificationType: body.notificationType,
        recipients: body.recipients,
      }

      const result = await sendBulkNotifications(bulkRequest)

      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Single notification request
    const request: NotificationRequest = {
      notificationType: body.notificationType,
      userId: body.userId,
      email: body.email,
      phone: body.phone,
      parameters: body.parameters || {},
      channel: body.channel,
      templateId: body.templateId, // Optional template ID override
    }

    // Validate required fields
    if (!request.notificationType) {
      return new Response(
        JSON.stringify({ error: 'notificationType is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!request.userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!request.email && !request.phone) {
      return new Response(
        JSON.stringify({ error: 'Either email or phone is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    const result = await sendSingleNotification(request)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Edge function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
