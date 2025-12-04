'use server'

import { supabaseServer } from '@/lib/supabase-server'
import { z } from 'zod'
import { getNotificationConfig, determineBestChannel } from '@/lib/notification-service'
import { getWeddingId } from '@/lib/wedding-context-server'
import { sendInviteWhatsApp } from '@/lib/invitations-service'
import { sendInvitationSms } from '@/lib/sms-service'
import { getEmailConfig, getWebsiteUrl } from '@/lib/email-service'
import type { InvitationNotificationParams } from '@/lib/types/notifications'
import { logger } from '@/lib/logger'

const sendRsvpReminderSchema = z.object({
  invitationId: z.string().uuid(),
  to: z.string().email().nullish(),
})

const sendBulkRsvpRemindersSchema = z.object({
  eventIds: z.array(z.string().uuid()).optional(),
  ignoreRateLimit: z.boolean().optional(),
})

interface RsvpReminderResult {
  success: boolean
  sent: number
  skipped: number
  errors: Array<{ invitationId: string; error: string }>
}

/**
 * Send urgent RSVP reminder to a single guest
 */
export async function sendRsvpReminderAction(data: z.infer<typeof sendRsvpReminderSchema>) {
  try {
    logger.info('[RSVP Reminder] Starting single reminder action', { invitationId: data.invitationId, to: data.to })
    const validated = sendRsvpReminderSchema.parse(data)
    const supabase = await supabaseServer()

    // Get wedding ID for multi-tenant support
    logger.debug('[RSVP Reminder] Resolving wedding ID')
    const weddingId = await getWeddingId()
    if (!weddingId) {
      logger.error('[RSVP Reminder] Wedding ID not found')
      throw new Error('Wedding ID is required to send RSVP reminders')
    }
    logger.info('[RSVP Reminder] Wedding ID resolved', { weddingId })

    // Get invitation with guest and events (including phone for multi-channel support)
    // First try with wedding_id filter, then fallback without it for backward compatibility
    const selectQuery = `
      id,
      token,
      wedding_id,
      guest_id,
      guest:guests!inner (
        id,
        email,
        phone,
        first_name,
        last_name,
        invite_code
      ),
      invitation_events (
        id,
        event_id,
        status,
        event:events (
          id,
          name,
          starts_at,
          venue,
          address
        )
      )
    `

    // Try with wedding_id filter first
    logger.debug('[RSVP Reminder] Fetching invitation with wedding_id filter', { invitationId: validated.invitationId, weddingId })
    let { data: invitation, error: invError } = await supabase
      .from('invitations')
      .select(selectQuery)
      .eq('id', validated.invitationId)
      .eq('wedding_id', weddingId)
      .maybeSingle()

    // If not found and wedding_id filter was applied, try without it for backward compatibility
    if ((invError || !invitation) && weddingId) {
      logger.debug('[RSVP Reminder] Invitation not found with wedding_id, trying fallback query')
      const { data: fallbackInvitation, error: fallbackError } = await supabase
        .from('invitations')
        .select(selectQuery)
        .eq('id', validated.invitationId)
        .maybeSingle()
      
      if (fallbackError) {
        logger.error('[RSVP Reminder] Error fetching invitation (fallback)', { error: fallbackError })
        throw new Error(`Failed to fetch invitation: ${fallbackError.message}`)
      }
      
      if (fallbackInvitation) {
        logger.debug('[RSVP Reminder] Fallback invitation found', { invitationWeddingId: fallbackInvitation.wedding_id })
        // Verify the invitation's wedding_id matches if it's set
        if (!fallbackInvitation.wedding_id || fallbackInvitation.wedding_id === weddingId) {
          invitation = fallbackInvitation
          invError = null
          logger.info('[RSVP Reminder] Using fallback invitation')
        } else {
          logger.error('[RSVP Reminder] Invitation belongs to different wedding', { 
            invitationWeddingId: fallbackInvitation.wedding_id, 
            expectedWeddingId: weddingId 
          })
          throw new Error(`Invitation belongs to a different wedding (ID: ${fallbackInvitation.wedding_id})`)
        }
      } else {
        logger.warn('[RSVP Reminder] Invitation not found in fallback query')
      }
    }

    if (invError) {
      logger.error('[RSVP Reminder] Error fetching invitation', { error: invError })
      throw new Error(`Failed to fetch invitation: ${invError.message}`)
    }

    if (!invitation) {
      logger.error('[RSVP Reminder] Invitation not found', { invitationId: validated.invitationId })
      throw new Error(`Invitation not found with ID: ${validated.invitationId}`)
    }

    logger.info('[RSVP Reminder] Invitation found', { invitationId: invitation.id, guestId: invitation.guest_id })

    // Use the invitation's wedding_id if available, otherwise use the resolved one
    const finalWeddingId = invitation.wedding_id || weddingId

    // Validate guest exists
    if (!invitation.guest) {
      logger.error('[RSVP Reminder] Guest not found for invitation', { invitationId: validated.invitationId })
      throw new Error(`Guest not found for invitation ${validated.invitationId}`)
    }

    const guest = invitation.guest as any
    logger.debug('[RSVP Reminder] Guest details', { 
      guestId: guest.id, 
      email: guest.email ? 'present' : 'missing', 
      phone: guest.phone ? 'present' : 'missing' 
    })
    
    // Validate invitation has events
    if (!invitation.invitation_events || invitation.invitation_events.length === 0) {
      logger.error('[RSVP Reminder] No events found for invitation', { invitationId: validated.invitationId })
      throw new Error(`No events found for invitation ${validated.invitationId}`)
    }
    
    logger.debug('[RSVP Reminder] Invitation events', { eventCount: invitation.invitation_events.length })
    
    // Check if already RSVP'd
    const hasResponded = invitation.invitation_events.some(
      (ie: any) => ie.status === 'accepted' || ie.status === 'declined'
    )

    if (hasResponded) {
      logger.warn('[RSVP Reminder] Guest has already RSVP\'d', { invitationId: validated.invitationId })
      throw new Error('Guest has already RSVP\'d')
    }

    const guestName = `${guest.first_name} ${guest.last_name}`
    logger.info('[RSVP Reminder] Processing reminder for guest', { guestName, invitationId: validated.invitationId })

    // Get notification config and determine best channel
    logger.debug('[RSVP Reminder] Fetching notification config', { weddingId: finalWeddingId })
    const notificationConfig = await getNotificationConfig(finalWeddingId)
    logger.debug('[RSVP Reminder] Notification config', { 
      emailEnabled: notificationConfig.notification_email_enabled, 
      whatsappEnabled: notificationConfig.notification_whatsapp_enabled, 
      smsEnabled: notificationConfig.notification_sms_enabled 
    })
    
    const channelDecision = await determineBestChannel(
      notificationConfig,
      { email: guest.email || validated.to || undefined, phone: guest.phone || undefined },
      finalWeddingId
    )

    logger.info('[RSVP Reminder] Channel decision', { 
      channel: channelDecision.channel, 
      phoneNumber: channelDecision.phoneNumber ? 'present' : 'missing',
      skipReason: channelDecision.skipReason 
    })

    if (!channelDecision.channel) {
      logger.warn('[RSVP Reminder] No channel available', { skipReason: channelDecision.skipReason })
      throw new Error(channelDecision.skipReason || 'No notification channel available for this guest')
    }

    // Prepare events data
    const events = invitation.invitation_events.map((ie: any) => ({
      id: ie.event.id,
      name: ie.event.name,
      startsAtISO: ie.event.starts_at,
      venue: ie.event.venue || '',
      address: ie.event.address || '',
    }))

    // Get email config and website URL for notification params
    const emailConfig = await getEmailConfig(finalWeddingId)
    const websiteUrl = await getWebsiteUrl(finalWeddingId)
    const baseUrl = websiteUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com'
    const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

    // Prepare primary event data for notification params
    const primaryEvent = invitation.invitation_events[0]
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
      rsvpUrl,
      inviteCode: guest.invite_code,
      websiteUrl,
    }

    // Send via the determined channel
    const channel = channelDecision.channel
    logger.info('[RSVP Reminder] Sending reminder via channel', { channel, guestName })
    let result: { success: boolean; message?: string; messageId?: string; error?: string }

    if (channel === 'email') {
      // Use edge function for email RSVP reminders
      const recipientEmail = validated.to || guest.email
      if (!recipientEmail) {
        logger.error('[RSVP Reminder] No email address available')
        throw new Error('No email address available')
      }

      logger.debug('[RSVP Reminder] Invoking email edge function', { recipientEmail, invitationId: invitation.id })
      const { data: functionResult, error: functionError } = await supabase.functions.invoke('send-rsvp-reminder', {
        body: {
          to: recipientEmail,
          guestName,
          invitationId: invitation.id,
          token: invitation.token,
          events,
          rsvpUrl,
        },
      })

      if (functionError) {
        logger.error('[RSVP Reminder] Error calling edge function', { error: functionError })
        throw new Error(`Failed to send reminder: ${functionError.message}`)
      }

      if (!functionResult?.success) {
        logger.error('[RSVP Reminder] Edge function returned error', { error: functionResult?.error })
        throw new Error(functionResult?.error || 'Failed to send reminder')
      }

      logger.info('[RSVP Reminder] Email reminder sent successfully', { messageId: functionResult.messageId })
      result = {
        success: true,
        message: 'Urgent RSVP reminder sent successfully via email',
        messageId: functionResult.messageId,
      }
    } else if (channel === 'whatsapp') {
      // Use WhatsApp service for RSVP reminders
      logger.debug('[RSVP Reminder] Sending WhatsApp reminder', { phoneNumber: channelDecision.phoneNumber })
      const waResult = await sendInviteWhatsApp({
        invitationId: invitation.id,
        eventIds: invitation.invitation_events.map((ie: any) => ie.event_id),
        phoneNumber: channelDecision.phoneNumber!,
        ignoreRateLimit: true,
      })

      if (waResult.success) {
        logger.info('[RSVP Reminder] WhatsApp reminder sent successfully')
      } else {
        logger.error('[RSVP Reminder] WhatsApp reminder failed', { error: waResult.message })
      }

      result = {
        success: waResult.success,
        message: waResult.success ? 'Urgent RSVP reminder sent successfully via WhatsApp' : waResult.message,
        error: waResult.success ? undefined : waResult.message,
      }
    } else if (channel === 'sms') {
      // Use SMS service for RSVP reminders
      logger.debug('[RSVP Reminder] Sending SMS reminder', { phoneNumber: channelDecision.phoneNumber })
      const smsResult = await sendInvitationSms({
        ...notificationParams,
        phoneNumber: channelDecision.phoneNumber!,
      })

      if (smsResult.success) {
        logger.info('[RSVP Reminder] SMS reminder sent successfully', { messageId: smsResult.messageId })
      } else {
        logger.error('[RSVP Reminder] SMS reminder failed', { error: smsResult.error })
      }

      result = {
        success: smsResult.success,
        message: smsResult.success ? 'Urgent RSVP reminder sent successfully via SMS' : 'Failed to send SMS reminder',
        messageId: smsResult.messageId,
        error: smsResult.error,
      }
    } else {
      logger.error('[RSVP Reminder] Unsupported channel', { channel })
      throw new Error(`Unsupported channel: ${channel}`)
    }

    if (!result.success) {
      logger.error('[RSVP Reminder] Reminder sending failed', { error: result.error })
      throw new Error(result.error || 'Failed to send reminder')
    }

    logger.info('[RSVP Reminder] Reminder sent successfully', { channel, messageId: result.messageId })
    return {
      success: true,
      message: result.message || 'Urgent RSVP reminder sent successfully',
      messageId: result.messageId,
      channel,
    }
  } catch (error) {
    logger.error('[RSVP Reminder] Error in sendRsvpReminderAction', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

/**
 * Send urgent RSVP reminders to all guests who haven't responded
 */
export async function sendBulkRsvpRemindersAction(
  data: z.infer<typeof sendBulkRsvpRemindersSchema> = {}
): Promise<RsvpReminderResult> {
  try {
    logger.info('[Bulk RSVP Reminders] Starting bulk reminder action', { 
      eventIds: data.eventIds, 
      ignoreRateLimit: data.ignoreRateLimit 
    })
    const validated = sendBulkRsvpRemindersSchema.parse(data)
    const supabase = await supabaseServer()

    // Get wedding ID for multi-tenant support
    logger.debug('[Bulk RSVP Reminders] Resolving wedding ID')
    const weddingId = await getWeddingId()
    if (!weddingId) {
      logger.error('[Bulk RSVP Reminders] Wedding ID not found')
      throw new Error('Wedding ID is required to send RSVP reminders')
    }
    logger.info('[Bulk RSVP Reminders] Wedding ID resolved', { weddingId })

    // Get notification config once for all invitations
    logger.debug('[Bulk RSVP Reminders] Fetching notification config', { weddingId })
    const notificationConfig = await getNotificationConfig(weddingId)
    logger.debug('[Bulk RSVP Reminders] Notification config', { 
      emailEnabled: notificationConfig.notification_email_enabled, 
      whatsappEnabled: notificationConfig.notification_whatsapp_enabled, 
      smsEnabled: notificationConfig.notification_sms_enabled 
    })
    const emailConfig = await getEmailConfig(weddingId)
    const websiteUrl = await getWebsiteUrl(weddingId)
    const baseUrl = websiteUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com'
    logger.debug('[Bulk RSVP Reminders] Base URL resolved', { baseUrl })

    // Build query to get all invitations with pending RSVPs (including phone for multi-channel support)
    let query = supabase
      .from('invitations')
      .select(`
        id,
        token,
        wedding_id,
        guest:guests!invitations_guest_id_fkey (
          id,
          email,
          phone,
          first_name,
          last_name,
          invite_code
        ),
        invitation_events (
          id,
          event_id,
          status,
          event:events!invitation_events_event_id_fkey (
            id,
            name,
            starts_at,
            venue,
            address
          )
        )
      `)
      .eq('wedding_id', weddingId)

    // If specific events are provided, filter by them
    if (validated.eventIds && validated.eventIds.length > 0) {
      const { data: invitationsForEvents, error: filterError } = await supabase
        .from('invitation_events')
        .select('invitation_id')
        .in('event_id', validated.eventIds)

      if (filterError) {
        throw new Error(`Failed to filter invitations: ${filterError.message}`)
      }

      const invitationIds = [...new Set(invitationsForEvents.map((ie: any) => ie.invitation_id))]
      query = query.in('id', invitationIds)
    }

    logger.debug('[Bulk RSVP Reminders] Fetching invitations')
    const { data: invitations, error: invError } = await query

    if (invError) {
      logger.error('[Bulk RSVP Reminders] Error fetching invitations', { error: invError })
      throw new Error(`Failed to fetch invitations: ${invError.message}`)
    }

    if (!invitations || invitations.length === 0) {
      logger.info('[Bulk RSVP Reminders] No invitations found')
      return {
        success: true,
        sent: 0,
        skipped: 0,
        errors: [],
      }
    }

    logger.info('[Bulk RSVP Reminders] Invitations fetched', { totalInvitations: invitations.length })

    const result: RsvpReminderResult = {
      success: true,
      sent: 0,
      skipped: 0,
      errors: [],
    }

    // Filter to only pending invitations
    const pendingInvitations = invitations.filter((invitation: any) => {
      const hasResponded = invitation.invitation_events.some(
        (ie: any) => ie.status === 'accepted' || ie.status === 'declined'
      )
      return !hasResponded
    })
    
    logger.info('[Bulk RSVP Reminders] Pending invitations filtered', { 
      total: invitations.length, 
      pending: pendingInvitations.length 
    })
    // Send reminders
    logger.info('[Bulk RSVP Reminders] Starting to send reminders', { pendingCount: pendingInvitations.length })
    for (let i = 0; i < pendingInvitations.length; i++) {
      const invitation = pendingInvitations[i]
      try {
        logger.debug('[Bulk RSVP Reminders] Processing invitation', { 
          index: i + 1, 
          total: pendingInvitations.length, 
          invitationId: invitation.id 
        })
        const guest = invitation.guest as any
        const guestName = `${guest.first_name} ${guest.last_name}`

        // Determine best channel for this guest
        logger.debug('[Bulk RSVP Reminders] Determining channel', { 
          invitationId: invitation.id, 
          hasEmail: !!guest.email, 
          hasPhone: !!guest.phone 
        })
        const channelDecision = await determineBestChannel(
          notificationConfig,
          { email: guest.email, phone: guest.phone },
          weddingId
        )

        logger.debug('[Bulk RSVP Reminders] Channel decision', { 
          invitationId: invitation.id, 
          channel: channelDecision.channel, 
          skipReason: channelDecision.skipReason 
        })

        if (!channelDecision.channel) {
          logger.warn('[Bulk RSVP Reminders] Skipping invitation - no channel', { 
            invitationId: invitation.id, 
            skipReason: channelDecision.skipReason 
          })
          result.skipped++
          continue
        }

        // Check rate limit (unless ignored)
        if (!validated.ignoreRateLimit) {
          logger.debug('[Bulk RSVP Reminders] Checking rate limit', { invitationId: invitation.id })
          const { data: recentReminders } = await supabase
            .from('mail_logs')
            .select('created_at')
            .eq('token', invitation.token)
            .eq('metadata->>type', 'rsvp_reminder')
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

          if (recentReminders && recentReminders.length > 0) {
            logger.debug('[Bulk RSVP Reminders] Skipping due to rate limit', { 
              invitationId: invitation.id, 
              recentCount: recentReminders.length 
            })
            result.skipped++
            continue
          }
        }

        // Filter events based on eventIds if provided
        let eventsToInclude = invitation.invitation_events
        if (validated.eventIds && validated.eventIds.length > 0) {
          eventsToInclude = eventsToInclude.filter((ie: any) => 
            validated.eventIds!.includes(ie.event_id)
          )
        }

        if (eventsToInclude.length === 0) {
          result.skipped++
          continue
        }

        // Prepare events data
        const events = eventsToInclude.map((ie: any) => ({
          id: ie.event.id,
          name: ie.event.name,
          startsAtISO: ie.event.starts_at,
          venue: ie.event.venue || '',
          address: ie.event.address || '',
        }))

        // Generate RSVP URL
        const rsvpUrl = `${baseUrl}/rsvp?token=${invitation.token}`

        // Prepare primary event data for notification params
        const primaryEvent = eventsToInclude[0]
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
          rsvpUrl,
          inviteCode: guest.invite_code,
          websiteUrl,
        }

        // Send via the determined channel
        const channel = channelDecision.channel
        logger.info('[Bulk RSVP Reminders] Sending reminder', { 
          invitationId: invitation.id, 
          guestName, 
          channel 
        })
        let sendError: string | null = null

        if (channel === 'email') {
          // Use edge function for email RSVP reminders
          if (!guest.email) {
            logger.warn('[Bulk RSVP Reminders] Skipping - no email', { invitationId: invitation.id })
            result.skipped++
            continue
          }

          logger.debug('[Bulk RSVP Reminders] Invoking email edge function', { 
            invitationId: invitation.id, 
            recipientEmail: guest.email 
          })
          const { error: functionError } = await supabase.functions.invoke('send-rsvp-reminder', {
            body: {
              to: guest.email,
              guestName,
              invitationId: invitation.id,
              token: invitation.token,
              events,
              rsvpUrl,
            },
          })

          if (functionError) {
            logger.error('[Bulk RSVP Reminders] Email edge function error', { 
              invitationId: invitation.id, 
              error: functionError 
            })
            sendError = functionError.message
          } else {
            logger.debug('[Bulk RSVP Reminders] Email reminder sent', { invitationId: invitation.id })
          }
        } else if (channel === 'whatsapp') {
          // Use WhatsApp service for RSVP reminders
          logger.debug('[Bulk RSVP Reminders] Sending WhatsApp reminder', { 
            invitationId: invitation.id, 
            phoneNumber: channelDecision.phoneNumber 
          })
          const waResult = await sendInviteWhatsApp({
            invitationId: invitation.id,
            eventIds: eventsToInclude.map((ie: any) => ie.event_id),
            phoneNumber: channelDecision.phoneNumber!,
            ignoreRateLimit: validated.ignoreRateLimit,
          })

          if (!waResult.success) {
            logger.error('[Bulk RSVP Reminders] WhatsApp reminder failed', { 
              invitationId: invitation.id, 
              error: waResult.message 
            })
            sendError = waResult.message
          } else {
            logger.debug('[Bulk RSVP Reminders] WhatsApp reminder sent', { invitationId: invitation.id })
          }
        } else if (channel === 'sms') {
          // Use SMS service for RSVP reminders
          logger.debug('[Bulk RSVP Reminders] Sending SMS reminder', { 
            invitationId: invitation.id, 
            phoneNumber: channelDecision.phoneNumber 
          })
          const smsResult = await sendInvitationSms({
            ...notificationParams,
            phoneNumber: channelDecision.phoneNumber!,
          })

          if (!smsResult.success) {
            logger.error('[Bulk RSVP Reminders] SMS reminder failed', { 
              invitationId: invitation.id, 
              error: smsResult.error 
            })
            sendError = smsResult.error || 'Failed to send SMS'
          } else {
            logger.debug('[Bulk RSVP Reminders] SMS reminder sent', { 
              invitationId: invitation.id, 
              messageId: smsResult.messageId 
            })
          }
        } else {
          logger.error('[Bulk RSVP Reminders] Unsupported channel', { 
            invitationId: invitation.id, 
            channel 
          })
          sendError = `Unsupported channel: ${channel}`
        }

        if (sendError) {
          logger.error('[Bulk RSVP Reminders] Error sending reminder', { 
            invitationId: invitation.id, 
            channel, 
            error: sendError 
          })
          result.errors.push({
            invitationId: invitation.id,
            error: sendError,
          })
          continue
        }

        result.sent++
        logger.debug('[Bulk RSVP Reminders] Reminder sent successfully', { 
          invitationId: invitation.id, 
          channel, 
          sent: result.sent, 
          skipped: result.skipped 
        })

        // Add delay to avoid rate limiting (100ms between notifications)
        await new Promise(resolve => setTimeout(resolve, 100))
      } catch (error) {
        logger.error('[Bulk RSVP Reminders] Error processing invitation', { 
          invitationId: invitation.id, 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
        result.errors.push({
          invitationId: invitation.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    logger.info('[Bulk RSVP Reminders] Bulk reminder action completed', { 
      sent: result.sent, 
      skipped: result.skipped, 
      errors: result.errors.length 
    })
    return result
  } catch (error) {
    logger.error('[Bulk RSVP Reminders] Error in sendBulkRsvpRemindersAction', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    throw error
  }
}

