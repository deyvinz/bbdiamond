import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'
import { getNotificationConfig, determineBestChannel } from '@/lib/notification-service'
import { isNotificationAPIConfigured, mapAnnouncementToMergeTags } from '@/lib/notificationapi-service'

/**
 * Check if NotificationAPI should be used
 */
function useNotificationAPI(): boolean {
  return (
    process.env.NOTIFICATION_PROVIDER === 'notificationapi' &&
    isNotificationAPIConfigured()
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Announcement ID is required' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Get announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (announcementError) {
      console.error('Error fetching announcement:', announcementError)
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if announcement can be sent
    if (announcement.status === 'sending') {
      return NextResponse.json(
        { success: false, error: 'Announcement is already being sent' },
        { status: 400 }
      )
    }

    if (announcement.status === 'sent') {
      return NextResponse.json(
        { success: false, error: 'Announcement has already been sent' },
        { status: 400 }
      )
    }

    // Update status to sending
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ status: 'sending' })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating announcement status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update announcement status' },
        { status: 500 }
      )
    }

    // Get pending recipients with guest contact info
    const { data: recipients, error: recipientsError } = await supabase
      .from('announcement_recipients')
      .select(`
        id,
        guest_id,
        email,
        guest:guests(
          id,
          first_name,
          last_name,
          email,
          phone
        )
      `)
      .eq('announcement_id', id)
      .eq('status', 'pending')
      .limit(announcement.batch_size)

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recipients' },
        { status: 500 }
      )
    }

    if (!recipients || recipients.length === 0) {
      // No more recipients to send to
      await supabase
        .from('announcements')
        .update({ status: 'sent' })
        .eq('id', id)

      await bumpNamespaceVersion()

      return NextResponse.json({
        success: true,
        message: 'No more recipients to send to. Announcement marked as sent.'
      })
    }

    // Use NotificationAPI if configured
    if (useNotificationAPI()) {
      return await sendViaNotificationAPI(supabase, id, announcement, recipients)
    }

    // Get notification config (legacy path)
    const notificationConfig = await getNotificationConfig(announcement.wedding_id)

    // Group recipients by channel based on notification preferences
    const recipientsByChannel: {
      email: Array<{ id: string; email: string; guest_name: string }>
      sms: Array<{ id: string; phone: string; guest_name: string }>
      whatsapp: Array<{ id: string; phone: string; guest_name: string }>
    } = {
      email: [],
      sms: [],
      whatsapp: [],
    }

    // Determine best channel for each recipient
    for (const recipient of recipients) {
      const guest = recipient.guest as any
      const guestName = `${guest?.first_name || ''} ${guest?.last_name || ''}`.trim() || 'Guest'

      // Determine best channel
      const channelDecision = await determineBestChannel(
        notificationConfig,
        {
          email: guest?.email || recipient.email,
          phone: guest?.phone,
        },
        announcement.wedding_id
      )

      if (channelDecision.channel === 'email' && guest?.email) {
        recipientsByChannel.email.push({
          id: recipient.id,
          email: guest.email,
          guest_name: guestName,
        })
      } else if (channelDecision.channel === 'sms' && guest?.phone) {
        recipientsByChannel.sms.push({
          id: recipient.id,
          phone: guest.phone,
          guest_name: guestName,
        })
      } else if (channelDecision.channel === 'whatsapp' && guest?.phone) {
        recipientsByChannel.whatsapp.push({
          id: recipient.id,
          phone: guest.phone,
          guest_name: guestName,
        })
      } else {
        // No channel available - skip this recipient
        await supabase
          .from('announcement_recipients')
          .update({
            status: 'skipped',
            error_message: channelDecision.skipReason || 'No notification channel available',
          })
          .eq('id', recipient.id)
      }
    }

    // Create batch record
    const totalRecipientsToSend = recipientsByChannel.email.length + recipientsByChannel.sms.length + recipientsByChannel.whatsapp.length

    if (totalRecipientsToSend === 0) {
      // No recipients to send to
      await supabase
        .from('announcements')
        .update({ status: 'sent' })
        .eq('id', id)
      
      await bumpNamespaceVersion()
      
      return NextResponse.json({
        success: true,
        message: 'No recipients available for sending. All recipients skipped.',
      })
    }

    const { data: batch, error: batchError } = await supabase
      .from('announcement_batches')
      .insert({
        announcement_id: id,
        batch_number: 1, // This should be calculated based on existing batches
        total_in_batch: totalRecipientsToSend,
        status: 'sending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating batch:', batchError)
      return NextResponse.json(
        { success: false, error: 'Failed to create batch record' },
        { status: 500 }
      )
    }

    const announcementPayload = {
      announcement_id: id,
      batch_id: batch.id,
      wedding_id: announcement.wedding_id,
      announcement: {
        title: announcement.title,
        subject: announcement.subject,
        content: announcement.content
      }
    }

    const results: Array<{ channel: string; success: boolean; error?: string }> = []

    // Send emails if any recipients
    if (recipientsByChannel.email.length > 0) {
      try {
        const { data: emailResult, error: emailError } = await supabase.functions.invoke('send-announcement-emails', {
          body: {
            ...announcementPayload,
            recipients: recipientsByChannel.email,
          }
        })

        if (emailError) {
          console.error('Error calling email edge function:', emailError)
          results.push({ channel: 'email', success: false, error: emailError.message })
        } else {
          results.push({ channel: 'email', success: true })
        }
      } catch (error) {
        console.error('Error sending emails:', error)
        results.push({ channel: 'email', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Send SMS if any recipients
    if (recipientsByChannel.sms.length > 0) {
      try {
        const { data: smsResult, error: smsError } = await supabase.functions.invoke('send-announcement-sms', {
          body: {
            ...announcementPayload,
            recipients: recipientsByChannel.sms,
          }
        })

        if (smsError) {
          console.error('Error calling SMS edge function:', smsError)
          results.push({ channel: 'sms', success: false, error: smsError.message })
        } else {
          results.push({ channel: 'sms', success: true })
        }
      } catch (error) {
        console.error('Error sending SMS:', error)
        results.push({ channel: 'sms', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Send WhatsApp if any recipients
    if (recipientsByChannel.whatsapp.length > 0) {
      try {
        const { data: whatsappResult, error: whatsappError } = await supabase.functions.invoke('send-announcement-whatsapp', {
          body: {
            ...announcementPayload,
            recipients: recipientsByChannel.whatsapp,
          }
        })

        if (whatsappError) {
          console.error('Error calling WhatsApp edge function:', whatsappError)
          results.push({ channel: 'whatsapp', success: false, error: whatsappError.message })
        } else {
          results.push({ channel: 'whatsapp', success: true })
        }
      } catch (error) {
        console.error('Error sending WhatsApp:', error)
        results.push({ channel: 'whatsapp', success: false, error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    // Check if all channels failed
    const allFailed = results.length > 0 && results.every(r => !r.success)

    if (allFailed) {
      // Update batch status to failed
      await supabase
        .from('announcement_batches')
        .update({ status: 'failed' })
        .eq('id', batch.id)

      // Update announcement status back to draft
      await supabase
        .from('announcements')
        .update({ status: 'draft' })
        .eq('id', id)

      await bumpNamespaceVersion()

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to send announcements',
          details: results
        },
        { status: 500 }
      )
    }

    // Invalidate cache
    await bumpNamespaceVersion()

    const channelSummary = [
      recipientsByChannel.email.length > 0 ? `${recipientsByChannel.email.length} email(s)` : null,
      recipientsByChannel.sms.length > 0 ? `${recipientsByChannel.sms.length} SMS` : null,
      recipientsByChannel.whatsapp.length > 0 ? `${recipientsByChannel.whatsapp.length} WhatsApp` : null,
    ].filter(Boolean).join(', ')

    return NextResponse.json({
      success: true,
      message: `Batch of ${totalRecipientsToSend} announcements queued for sending (${channelSummary})`,
      batch_id: batch.id,
      results
    })

  } catch (error) {
    console.error('Error sending announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Send announcement via NotificationAPI
 * Uses the unified NotificationAPI platform for all channels
 */
async function sendViaNotificationAPI(
  supabase: Awaited<ReturnType<typeof supabaseServer>>,
  announcementId: string,
  announcement: any,
  recipients: any[]
): Promise<NextResponse> {
  try {
    // Prepare recipients for NotificationAPI bulk send
    const notificationRecipients = recipients.map(recipient => {
      const guest = recipient.guest as any
      const guestName = `${guest?.first_name || ''} ${guest?.last_name || ''}`.trim() || 'Guest'

      return {
        recipientId: recipient.id,
        userId: guest?.email || guest?.phone || recipient.id,
        email: guest?.email,
        phone: guest?.phone,
        parameters: mapAnnouncementToMergeTags({
          guestName,
          title: announcement.title,
          content: announcement.content,
          coupleName: 'The Couple', // Could be fetched from wedding config
        }),
      }
    })

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('announcement_batches')
      .insert({
        announcement_id: announcementId,
        batch_number: 1,
        total_in_batch: notificationRecipients.length,
        status: 'sending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating batch:', batchError)
      return NextResponse.json(
        { success: false, error: 'Failed to create batch record' },
        { status: 500 }
      )
    }

    // Call NotificationAPI edge function for bulk send
    const { data: result, error: sendError } = await supabase.functions.invoke('send-notification', {
      body: {
        notificationType: 'announcement',
        recipients: notificationRecipients.map(r => ({
          userId: r.userId,
          email: r.email,
          phone: r.phone,
          parameters: r.parameters,
        })),
      }
    })

    if (sendError) {
      console.error('NotificationAPI error:', sendError)

      // Update batch status to failed
      await supabase
        .from('announcement_batches')
        .update({ status: 'failed' })
        .eq('id', batch.id)

      // Update announcement status back to draft
      await supabase
        .from('announcements')
        .update({ status: 'draft' })
        .eq('announcementId', announcementId)

      await bumpNamespaceVersion()

      return NextResponse.json(
        { success: false, error: sendError.message || 'Failed to send via NotificationAPI' },
        { status: 500 }
      )
    }

    // Update recipient statuses based on results
    if (result?.results) {
      for (let i = 0; i < result.results.length; i++) {
        const sendResult = result.results[i]
        const recipient = notificationRecipients[i]

        await supabase
          .from('announcement_recipients')
          .update({
            status: sendResult.success ? 'sent' : 'failed',
            sent_at: sendResult.success ? new Date().toISOString() : null,
            error_message: sendResult.error,
          })
          .eq('id', recipient.recipientId)
      }
    }

    // Update batch status
    await supabase
      .from('announcement_batches')
      .update({
        status: 'completed',
        sent_count: result?.totalSent || 0,
        failed_count: result?.totalFailed || 0,
      })
      .eq('id', batch.id)

    // Update announcement counts
    await supabase
      .from('announcements')
      .update({
        sent_count: announcement.sent_count + (result?.totalSent || 0),
        failed_count: announcement.failed_count + (result?.totalFailed || 0),
        status: 'sent',
      })
      .eq('id', announcementId)

    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: `Sent ${result?.totalSent || 0} announcements via NotificationAPI`,
      provider: 'notificationapi',
      batch_id: batch.id,
      totalSent: result?.totalSent || 0,
      totalFailed: result?.totalFailed || 0,
    })
  } catch (error) {
    console.error('Error sending via NotificationAPI:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
