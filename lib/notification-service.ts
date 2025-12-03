/**
 * Notification Orchestration Service
 * Handles multi-channel notification delivery (Email, WhatsApp, SMS)
 * with smart routing logic based on guest contact info and admin config
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
import type {
  NotificationChannel,
  NotificationConfig,
  NotificationResult,
  SendNotificationOptions,
  InvitationNotificationParams,
} from './types/notifications'

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
 * Send invitation notifications through all enabled channels
 * Implements smart routing for SMS/WhatsApp based on registration status
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
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(
        id,
        first_name,
        last_name,
        email,
        phone_number,
        preferred_contact_method,
        invite_code
      ),
      invitation_events(
        *,
        event:events(id, name, starts_at, venue, address)
      )
    `)
    .eq('id', options.invitationId)
    .eq('wedding_id', weddingId)
    .single()

  if (invitationError || !invitation) {
    throw new Error(`Invitation not found: ${options.invitationId}`)
  }

  const guest = invitation.guest
  const guestName = `${guest.first_name} ${guest.last_name}`

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

  // Determine which channels to use
  const channelsToUse = options.channels || determineChannels(notificationConfig)

  // 1. Handle Email Channel
  if (channelsToUse.includes('email') && notificationConfig.notification_email_enabled) {
    if (guest.email) {
      try {
        const emailResult = await sendInviteEmail({
          invitationId: options.invitationId,
          eventIds: options.eventIds,
          to: guest.email,
          includeQr: true,
          ignoreRateLimit: options.ignoreRateLimit ?? false,
        })

        results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.success ? undefined : emailResult.message,
        })
      } catch (error) {
        results.push({
          channel: 'email',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown email error',
        })
      }
    } else {
      results.push({
        channel: 'email',
        success: false,
        skipped: true,
        skipReason: 'Guest has no email address',
      })
    }
  }

  // 2. Handle SMS/WhatsApp with smart routing
  if (guest.phone_number) {
    const formattedPhone = formatPhoneNumber(guest.phone_number)
    const smsEnabled = channelsToUse.includes('sms') && notificationConfig.notification_sms_enabled
    const whatsappEnabled = channelsToUse.includes('whatsapp') && notificationConfig.notification_whatsapp_enabled

    if (smsEnabled && whatsappEnabled) {
      // Both enabled - check WhatsApp registration first
      const waStatus = await checkWhatsAppRegistration(formattedPhone)

      if (waStatus.isRegistered) {
        // Send via WhatsApp
        try {
          const waResult = await sendInviteWhatsApp({
            invitationId: options.invitationId,
            eventIds: options.eventIds,
            phoneNumber: formattedPhone,
            ignoreRateLimit: options.ignoreRateLimit,
          })

          results.push({
            channel: 'whatsapp',
            success: waResult.success,
            error: waResult.success ? undefined : waResult.message,
          })
        } catch (error) {
          results.push({
            channel: 'whatsapp',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
          })
        }
      } else {
        // Fallback to SMS
        try {
          const smsResult = await sendInvitationSms({
            ...notificationParams,
            phoneNumber: formattedPhone,
          })

          results.push({
            channel: 'sms',
            success: smsResult.success,
            messageId: smsResult.messageId,
            error: smsResult.error,
          })

          // Log SMS to mail_logs for tracking
          if (smsResult.success) {
            await logSmsDelivery(invitation.token, formattedPhone, smsResult.messageId, weddingId)
          }
        } catch (error) {
          results.push({
            channel: 'sms',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown SMS error',
          })
        }
      }
    } else if (whatsappEnabled) {
      // WhatsApp only - send if registered, skip otherwise
      const waStatus = await checkWhatsAppRegistration(formattedPhone)

      if (waStatus.isRegistered) {
        try {
          const waResult = await sendInviteWhatsApp({
            invitationId: options.invitationId,
            eventIds: options.eventIds,
            phoneNumber: formattedPhone,
            ignoreRateLimit: options.ignoreRateLimit,
          })

          results.push({
            channel: 'whatsapp',
            success: waResult.success,
            error: waResult.success ? undefined : waResult.message,
          })
        } catch (error) {
          results.push({
            channel: 'whatsapp',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown WhatsApp error',
          })
        }
      } else {
        results.push({
          channel: 'whatsapp',
          success: false,
          skipped: true,
          skipReason: 'Phone not registered on WhatsApp',
        })
      }
    } else if (smsEnabled) {
      // SMS only
      try {
        const smsResult = await sendInvitationSms({
          ...notificationParams,
          phoneNumber: formattedPhone,
        })

        results.push({
          channel: 'sms',
          success: smsResult.success,
          messageId: smsResult.messageId,
          error: smsResult.error,
        })

        // Log SMS to mail_logs for tracking
        if (smsResult.success) {
          await logSmsDelivery(invitation.token, formattedPhone, smsResult.messageId, weddingId)
        }
      } catch (error) {
        results.push({
          channel: 'sms',
          success: false,
          error: error instanceof Error ? error.message : 'Unknown SMS error',
        })
      }
    }
  } else {
    // No phone number
    if (channelsToUse.includes('whatsapp') && notificationConfig.notification_whatsapp_enabled) {
      results.push({
        channel: 'whatsapp',
        success: false,
        skipped: true,
        skipReason: 'Guest has no phone number',
      })
    }
    if (channelsToUse.includes('sms') && notificationConfig.notification_sms_enabled) {
      results.push({
        channel: 'sms',
        success: false,
        skipped: true,
        skipReason: 'Guest has no phone number',
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
 * Determine which channels to use based on config
 */
function determineChannels(config: NotificationConfig): NotificationChannel[] {
  const channels: NotificationChannel[] = []

  if (config.notification_email_enabled) {
    channels.push('email')
  }
  if (config.notification_whatsapp_enabled) {
    channels.push('whatsapp')
  }
  if (config.notification_sms_enabled) {
    channels.push('sms')
  }

  return channels
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
