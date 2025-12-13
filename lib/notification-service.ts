/**
 * Notification Orchestration Service
 * Handles multi-channel notification delivery (Email, WhatsApp, SMS)
 * with smart routing logic based on guest contact info and admin config
 *
 * Supports two modes:
 * - Legacy: Individual providers (Resend, Twilio, AWS SNS)
 * - NotificationAPI: Unified platform for all channels
 *
 * Set NOTIFICATION_PROVIDER=notificationapi to use NotificationAPI
 */

import { supabaseServer } from './supabase-server'
import { getAppConfig } from './config-service'
import { getWeddingId } from './wedding-context-server'
import { sendInviteEmail } from './invitations-service'
import { sendInviteWhatsApp } from './invitations-service'
import { checkWhatsAppRegistration, formatPhoneNumber } from './whatsapp-service'
import { sendInvitationSms, formatPhoneForTwilio, validatePhoneNumber } from './sms-service'
import { getEmailConfig, getWebsiteUrl } from './email-service'
import { logAdminAction } from './audit'
import {
  sendNotification as sendNotificationAPI,
  mapInvitationToMergeTags,
  isNotificationAPIConfigured,
  type NotificationType,
} from './notificationapi-service'
import type {
  NotificationChannel,
  NotificationConfig,
  NotificationResult,
  SendNotificationOptions,
  InvitationNotificationParams,
} from './types/notifications'

/**
 * Check if NotificationAPI should be used
 */
function useNotificationAPI(): boolean {
  return (
    process.env.NOTIFICATION_PROVIDER === 'notificationapi' &&
    isNotificationAPIConfigured()
  )
}

export interface NotificationOrchestrationResult {
  invitationId: string
  guestId: string
  guestName: string
  results: NotificationResult[]
  allSuccessful: boolean
  anySuccessful: boolean
}

/**
 * Get notification configuration from app config
 */
export async function getNotificationConfig(weddingId?: string): Promise<NotificationConfig> {
  const config = await getAppConfig(weddingId)

  return {
    notification_email_enabled: config.notification_email_enabled ?? true,
    notification_whatsapp_enabled: config.notification_whatsapp_enabled ?? false,
    notification_sms_enabled: config.notification_sms_enabled ?? false,
  }
}

/**
 * Determine the best notification channel to use based on priority and availability
 * Priority order (only considers enabled channels): email (0) > WhatsApp (1) > SMS (2)
 * 
 * Logic:
 * 1. Check enabled channels in priority order
 * 2. For each enabled channel, check if guest has required contact info
 * 3. For WhatsApp, also verify phone is registered
 * 4. Return first available channel in priority order
 */
export async function determineBestChannel(
  notificationConfig: NotificationConfig,
  guest: { email?: string; phone?: string },
  weddingId: string
): Promise<{ channel: NotificationChannel | null; phoneNumber?: string; skipReason?: string }> {
  // Build list of enabled channels in priority order
  const enabledChannels: Array<{ channel: NotificationChannel; priority: number }> = []
  
  if (notificationConfig.notification_email_enabled) {
    enabledChannels.push({ channel: 'email', priority: 0 })
  }
  if (notificationConfig.notification_whatsapp_enabled) {
    enabledChannels.push({ channel: 'whatsapp', priority: 1 })
  }
  if (notificationConfig.notification_sms_enabled) {
    enabledChannels.push({ channel: 'sms', priority: 2 })
  }

  // If no channels are enabled, return early
  if (enabledChannels.length === 0) {
    return { 
      channel: null, 
      skipReason: 'No notification channels are enabled for this wedding' 
    }
  }

  // Check channels in priority order (already sorted by priority)
  for (const { channel } of enabledChannels) {
    if (channel === 'email') {
      // Priority 0: Email - check if guest has email
      if (guest.email) {
        return { channel: 'email' }
      }
      // Email enabled but guest has no email - continue to next priority
    } else if (channel === 'whatsapp') {
      // Priority 1: WhatsApp - check if guest has phone and is registered
      if (guest.phone) {
        const formattedPhone = formatPhoneNumber(guest.phone)
        const waStatus = await checkWhatsAppRegistration(formattedPhone)
        
        // If there's a configuration error, skip WhatsApp and continue to SMS if enabled
        if (waStatus.error && waStatus.error.includes('configuration error')) {
          // Log the error but continue to next channel
          console.warn(`WhatsApp registration check failed due to configuration: ${waStatus.error}. Falling back to SMS if enabled.`)
          // Continue to SMS if enabled
        } else if (waStatus.isRegistered) {
          return { channel: 'whatsapp', phoneNumber: formattedPhone }
        }
        // WhatsApp enabled, phone available, but not registered - continue to SMS if enabled
      }
      // WhatsApp enabled but guest has no phone - continue to next priority
    } else if (channel === 'sms') {
      // Priority 2: SMS - check if guest has phone
      if (guest.phone) {
        const formattedPhone = formatPhoneNumber(guest.phone)
        return { channel: 'sms', phoneNumber: formattedPhone }
      }
      // SMS enabled but guest has no phone - no more channels to check
    }
  }

  // No channel available - generate detailed skip reason
  const enabledChannelNames = enabledChannels.map(c => c.channel).join(', ')
  let skipReason = `No available contact method for enabled channels: ${enabledChannelNames}`
  
  if (!guest.email && !guest.phone) {
    skipReason = `Guest has no email or phone number. Enabled channels: ${enabledChannelNames}`
  } else if (!guest.email && enabledChannels.some(c => c.channel === 'email')) {
    skipReason = `Guest has no email address. Enabled channels: ${enabledChannelNames}`
  } else if (guest.phone && enabledChannels.some(c => c.channel === 'whatsapp') && !enabledChannels.some(c => c.channel === 'sms')) {
    skipReason = `Phone not registered on WhatsApp and SMS is not enabled. Enabled channels: ${enabledChannelNames}`
  }

  return { channel: null, skipReason }
}

/**
 * Send invitation notifications using priority-based routing
 * Sends via ONE channel only based on priority: email > WhatsApp > SMS
 */
export async function sendInvitationNotification(
  options: SendNotificationOptions
): Promise<NotificationOrchestrationResult> {
  const supabase = await supabaseServer()
  const results: NotificationResult[] = []

  // Get wedding ID
  const weddingId = await getWeddingId()
  if (!weddingId) {
    throw new Error('Wedding ID is required to send notifications')
  }

  // Get notification config
  const notificationConfig = await getNotificationConfig(weddingId)

  // Get invitation with guest details
  // First try with wedding_id filter, then fallback without it for backward compatibility
  let { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(
        id,
        first_name,
        last_name,
        email,
        phone,
        invite_code
      ),
      invitation_events(
        *,
        event:events(id, name, starts_at, venue, address)
      )
    `)
    .eq('id', options.invitationId)
    .eq('wedding_id', weddingId)
    .maybeSingle()

  // If not found and wedding_id filter was applied, try without it for backward compatibility
  if ((invitationError || !invitation) && weddingId) {
    const { data: fallbackInvitation, error: fallbackError } = await supabase
      .from('invitations')
      .select(`
        *,
        guest:guests(
          id,
          first_name,
          last_name,
          email,
          phone,
          invite_code
        ),
        invitation_events(
          *,
          event:events(id, name, starts_at, venue, address)
        )
      `)
      .eq('id', options.invitationId)
      .maybeSingle()
    
    if (fallbackError) {
      throw new Error(`Invitation not found: ${options.invitationId} - ${fallbackError.message}`)
    }
    
    if (fallbackInvitation) {
      // Verify the invitation's wedding_id matches if it's set
      if (!fallbackInvitation.wedding_id || fallbackInvitation.wedding_id === weddingId) {
        invitation = fallbackInvitation
        invitationError = null
      } else {
        throw new Error(`Invitation belongs to a different wedding (ID: ${fallbackInvitation.wedding_id})`)
      }
    }
  }

  if (invitationError || !invitation) {
    const errorMsg = invitationError 
      ? `Invitation not found: ${options.invitationId} - ${invitationError.message}`
      : `Invitation not found: ${options.invitationId}`
    throw new Error(errorMsg)
  }

  // Validate guest exists
  if (!invitation.guest) {
    throw new Error(`Guest not found for invitation ${options.invitationId}`)
  }

  const guest = invitation.guest
  const guestName = `${guest.first_name} ${guest.last_name || ''}`

  // Ensure phone is available - check both 'phone' and 'phone_number' properties
  // as there might be inconsistencies in the database schema
  const guestPhone = (guest as any).phone || (guest as any).phone_number || null

  // Get selected events
  const selectedEvents = invitation.invitation_events?.filter((ie: any) =>
    options.eventIds.includes(ie.event_id)
  ) || []

  if (selectedEvents.length === 0) {
    throw new Error('No valid events found for invitation')
  }

  // Get email config for branding
  const emailConfig = await getEmailConfig(weddingId)
  const websiteUrl = await getWebsiteUrl(weddingId)

  // Prepare notification params
  const primaryEvent = selectedEvents[0]
  const [datePart, timePart] = primaryEvent.event.starts_at.split(' ')
  const [year, month, day] = datePart.split('-')
  const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const eventTime = timePart ? timePart.substring(0, 5) : '00:00'

  const notificationParams: InvitationNotificationParams = {
    guestName,
    guestFirstName: guest.first_name,
    coupleName: emailConfig?.branding?.coupleDisplayName || 'The Couple',
    eventName: primaryEvent.event.name,
    eventDate,
    eventTime,
    venue: primaryEvent.event.venue,
    address: primaryEvent.event.address,
    rsvpUrl: `${websiteUrl}/rsvp?token=${invitation.token}`,
    inviteCode: guest.invite_code,
    websiteUrl,
  }

  // Use NotificationAPI if configured
  if (useNotificationAPI()) {
    // Still use determineBestChannel to respect admin config and guest contact info
    // Pass guest contact info explicitly to ensure correct channel selection
    console.log('[sendInvitationNotification] Guest contact info:', {
      guestId: guest.id,
      hasEmail: !!guest.email,
      hasPhone: !!guestPhone,
      email: guest.email,
      phone: guestPhone,
      guestObject: guest,
    })
    
    const channelDecision = await determineBestChannel(
      notificationConfig, 
      { email: guest.email || undefined, phone: guestPhone || undefined }, 
      weddingId
    )

    console.log('[sendInvitationNotification] Channel decision:', {
      channel: channelDecision.channel,
      skipReason: channelDecision.skipReason,
      phoneNumber: channelDecision.phoneNumber,
      notificationConfig,
    })

    return sendInvitationViaNotificationAPI({
      invitationId: options.invitationId,
      guestId: guest.id,
      guestName,
      email: guest.email || undefined,
      phone: guestPhone || undefined,
      notificationParams,
      weddingId,
      channel: channelDecision.channel, // Pass the determined channel
      skipReason: channelDecision.skipReason,
    })
  }

  // Determine best channel to use based on priority (legacy path)
  // Pass guest contact info explicitly to ensure correct channel selection
  const channelDecision = await determineBestChannel(
    notificationConfig, 
    { email: guest.email || undefined, phone: guestPhone || undefined }, 
    weddingId
  )

  if (!channelDecision.channel) {
    // No channel available
    results.push({
      channel: 'email', // Default for tracking purposes
      success: false,
      skipped: true,
      skipReason: channelDecision.skipReason || 'No notification channel available',
    })
  } else {
    // Send via the determined channel
    const channel = channelDecision.channel

    try {
      if (channel === 'email') {
        const emailResult = await sendInviteEmail({
          invitationId: options.invitationId,
          eventIds: options.eventIds,
          to: guest.email!,
          includeQr: true,
          ignoreRateLimit: options.ignoreRateLimit ?? false,
        })

        results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.success ? undefined : emailResult.message,
        })
      } else if (channel === 'whatsapp') {
        const waResult = await sendInviteWhatsApp({
          invitationId: options.invitationId,
          eventIds: options.eventIds,
          phoneNumber: channelDecision.phoneNumber!,
          ignoreRateLimit: options.ignoreRateLimit,
        })

        results.push({
          channel: 'whatsapp',
          success: waResult.success,
          error: waResult.success ? undefined : waResult.message,
        })
      } else if (channel === 'sms') {
        const smsResult = await sendInvitationSms({
          ...notificationParams,
          phoneNumber: channelDecision.phoneNumber!,
        })

        results.push({
          channel: 'sms',
          success: smsResult.success,
          messageId: smsResult.messageId,
          error: smsResult.error,
        })

        // Log SMS to mail_logs for tracking
        if (smsResult.success) {
          await logSmsDelivery(invitation.token, channelDecision.phoneNumber!, smsResult.messageId, weddingId)
        }
      }
    } catch (error) {
      results.push({
        channel,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  // Log audit
  await logAdminAction('notification_send', {
    wedding_id: weddingId,
    invitation_id: options.invitationId,
    guest_id: guest.id,
    channels_attempted: results.map(r => r.channel),
    results: results.map(r => ({
      channel: r.channel,
      success: r.success,
      skipped: r.skipped,
    })),
  })

  return {
    invitationId: options.invitationId,
    guestId: guest.id,
    guestName,
    results,
    allSuccessful: results.every(r => r.success || r.skipped),
    anySuccessful: results.some(r => r.success),
  }
}

/**
 * Send bulk notifications to multiple invitations
 */
export async function sendBulkInvitationNotifications(
  invitationIds: string[],
  eventIds: string[],
  options?: {
    channels?: NotificationChannel[]
    ignoreRateLimit?: boolean
  }
): Promise<NotificationOrchestrationResult[]> {
  const results: NotificationOrchestrationResult[] = []

  for (const invitationId of invitationIds) {
    try {
      const result = await sendInvitationNotification({
        invitationId,
        eventIds,
        channels: options?.channels,
        ignoreRateLimit: options?.ignoreRateLimit,
      })
      results.push(result)
    } catch (error) {
      console.error(`Failed to send notification for invitation ${invitationId}:`, error)
      results.push({
        invitationId,
        guestId: '',
        guestName: 'Unknown',
        results: [{
          channel: 'email',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }],
        allSuccessful: false,
        anySuccessful: false,
      })
    }
  }

  return results
}


/**
 * Log SMS delivery to mail_logs table for tracking
 */
async function logSmsDelivery(
  token: string,
  phoneNumber: string,
  messageId: string | undefined,
  weddingId: string
): Promise<void> {
  const supabase = await supabaseServer()

  await supabase.from('mail_logs').insert({
    token,
    email: phoneNumber, // Store phone number in email field for SMS
    sent_at: new Date().toISOString(),
    success: true,
    channel: 'sms',
    message_id: messageId,
  })
}

/**
 * Send invitation via NotificationAPI
 * Uses the unified NotificationAPI platform for all channels
 * Respects the channel determined by determineBestChannel()
 */
async function sendInvitationViaNotificationAPI(params: {
  invitationId: string
  guestId: string
  guestName: string
  email?: string
  phone?: string
  notificationParams: InvitationNotificationParams
  weddingId: string
  channel: NotificationChannel | null
  skipReason?: string
}): Promise<NotificationOrchestrationResult> {
  const { invitationId, guestId, guestName, email, phone, notificationParams, weddingId, channel, skipReason } = params
  const results: NotificationResult[] = []

  // If no channel available, skip notification
  if (!channel) {
    results.push({
      channel: 'email', // Default for tracking purposes
      success: false,
      skipped: true,
      skipReason: skipReason || 'No notification channel available',
    })

    return {
      invitationId,
      guestId,
      guestName,
      results,
      allSuccessful: false,
      anySuccessful: false,
    }
  }

  // Convert to NotificationAPI format
  const mergeTags = mapInvitationToMergeTags(notificationParams)

  // Create unique user ID for NotificationAPI
  const userId = email || phone || guestId

  try {
    const result = await sendNotificationAPI({
      type: 'wedding_invitation',
      userId,
      email,
      phone,
      parameters: mergeTags,
      weddingId,
      channel, // Pass the specific channel to use
    })

    results.push({
      channel,
      success: result.success,
      messageId: result.notificationApiId,
      error: result.error,
    })

    // Log audit
    await logAdminAction('notification_send', {
      wedding_id: weddingId,
      invitation_id: invitationId,
      guest_id: guestId,
      provider: 'notificationapi',
      channel_used: channel,
      channels_attempted: [channel],
      results: results.map(r => ({
        channel: r.channel,
        success: r.success,
      })),
    })
  } catch (error) {
    results.push({
      channel,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }

  return {
    invitationId,
    guestId,
    guestName,
    results,
    allSuccessful: results.every(r => r.success),
    anySuccessful: results.some(r => r.success),
  }
}
