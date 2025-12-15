import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import { supabaseServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface NotificationLogsQueryParams {
  page?: string
  page_size?: string
  channel?: string
  status?: string
  date_from?: string
  date_to?: string
  search?: string
  log_type?: 'mail' | 'notification' | 'all'
}

export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('page_size') || '20', 10)
    const channel = searchParams.get('channel') || undefined
    const status = searchParams.get('status') || undefined
    const dateFrom = searchParams.get('date_from') || undefined
    const dateTo = searchParams.get('date_to') || undefined
    const search = searchParams.get('search') || undefined
    const logType = (searchParams.get('log_type') || 'all') as 'mail' | 'notification' | 'all'

    const offset = (page - 1) * pageSize

    // Fetch mail_logs - join with invitations to filter by wedding_id
    let mailLogs: any[] = []
    let mailLogsCount = 0

    if (logType === 'all' || logType === 'mail') {
      // First, get all invitation tokens for this wedding
      const { data: invitations } = await supabase
        .from('invitations')
        .select('token, id, guest:guests(id, first_name, last_name, email, phone)')
        .eq('wedding_id', weddingId)

      const invitationTokens = invitations?.map((inv: any) => inv.token) || []
      const invitationMap = new Map(invitations?.map((inv: any) => [inv.token, inv]) || [])

      if (invitationTokens.length > 0) {
        let mailQuery = supabase
          .from('mail_logs')
          .select('*', { count: 'exact' })
          .in('token', invitationTokens)
          .order('sent_at', { ascending: false })

        // Apply filters
        if (channel) {
          mailQuery = mailQuery.eq('channel', channel)
        }
        if (status === 'success') {
          mailQuery = mailQuery.eq('success', true)
        } else if (status === 'failed') {
          mailQuery = mailQuery.eq('success', false)
        }
        if (dateFrom) {
          mailQuery = mailQuery.gte('sent_at', dateFrom)
        }
        if (dateTo) {
          mailQuery = mailQuery.lte('sent_at', dateTo)
        }
        if (search) {
          mailQuery = mailQuery.or(`email.ilike.%${search}%,token.ilike.%${search}%`)
        }

        // Get count
        const { count } = await mailQuery
        mailLogsCount = count || 0

        // Get all data (we'll paginate after combining with notification_logs)
        const { data, error } = await mailQuery

        if (error) {
          console.error('Error fetching mail_logs:', error)
        } else {
          mailLogs = (data || []).map((log: any) => {
            const invitation = invitationMap.get(log.token) as any
            const guest = invitation?.guest as any
            return {
              id: log.id,
              token: log.token,
              email: log.email,
              sent_at: log.sent_at,
              success: log.success,
              error_message: log.error_message,
              channel: log.channel || 'email',
              message_id: log.message_id,
              invitation_id: log.invitation_id || invitation?.id,
              meta: log.meta,
              log_source: 'mail_logs',
              notification_type: log.channel === 'sms' ? 'sms' : log.channel === 'whatsapp' ? 'whatsapp' : 'email',
              guest_name: guest ? `${guest.first_name} ${guest.last_name}` : undefined,
              guest_email: guest?.email,
              guest_phone: guest?.phone,
            }
          })
        }
      }
    }

    // Fetch notification_logs
    let notificationLogs: any[] = []
    let notificationLogsCount = 0

    if (logType === 'all' || logType === 'notification') {
      let notificationQuery = supabase
        .from('notification_logs')
        .select('*', { count: 'exact' })
        .eq('wedding_id', weddingId)
        .order('created_at', { ascending: false })

      // Apply filters
      // Note: Channel filtering is done in memory for backward compatibility
      // (to support records with channel in parameters field)
      if (status === 'delivered') {
        notificationQuery = notificationQuery.eq('status', 'delivered')
      } else if (status === 'failed') {
        notificationQuery = notificationQuery.eq('status', 'failed')
      }
      if (dateFrom) {
        notificationQuery = notificationQuery.gte('created_at', dateFrom)
      }
      if (dateTo) {
        notificationQuery = notificationQuery.lte('created_at', dateTo)
      }
      if (search) {
        notificationQuery = notificationQuery.or(
          `recipient_email.ilike.%${search}%,recipient_phone.ilike.%${search}%,recipient_id.ilike.%${search}%`
        )
      }

      // Get count (before channel filtering)
      const { count } = await notificationQuery
      notificationLogsCount = count || 0

      // Get all data (we'll paginate after combining with mail_logs)
      const { data, error } = await notificationQuery

      if (error) {
        console.error('Error fetching notification_logs:', error)
      } else {
        // Fetch all guests for this wedding to create a lookup map
        const { data: guests } = await supabase
          .from('guests')
          .select('id, email, phone, first_name, last_name')
          .eq('wedding_id', weddingId)

        // Create lookup maps for efficient guest name resolution
        const guestById = new Map<string, string>(
          guests?.map((g: { id: string; first_name: string; last_name: string }) => [
            g.id,
            `${g.first_name} ${g.last_name}`.trim(),
          ]) || []
        )
        const guestByEmail = new Map<string, string>(
          guests
            ?.filter((g: { email?: string }) => g.email)
            .map((g: { email: string; first_name: string; last_name: string }) => [
              g.email,
              `${g.first_name} ${g.last_name}`.trim(),
            ]) || []
        )
        const guestByPhone = new Map<string, string>(
          guests
            ?.filter((g: { phone?: string }) => g.phone)
            .map((g: { phone: string; first_name: string; last_name: string }) => [
              g.phone,
              `${g.first_name} ${g.last_name}`.trim(),
            ]) || []
        )

        notificationLogs = (data || []).map((log: { 
          delivered_at: any
          created_at: any
          status: string
          recipient_email: any
          recipient_phone: any
          recipient_id: any
          notification_type: string
          channel?: 'email' | 'sms' | 'whatsapp'
          guest_name?: string
          parameters?: Record<string, any>
        }) => {
          // Determine channel: check column first, then parameters, then infer
          let determinedChannel: 'email' | 'sms' | 'whatsapp' = 'email'
          
          if (log.channel) {
            // Channel explicitly stored in column
            determinedChannel = log.channel
          } else if (log.parameters?.channel) {
            // Channel explicitly stored in parameters
            determinedChannel = log.parameters.channel as 'email' | 'sms' | 'whatsapp'
          } else if (log.recipient_phone && !log.recipient_email) {
            // Only phone number present, likely SMS
            determinedChannel = 'sms'
          } else if (log.recipient_email) {
            // Email present, default to email
            determinedChannel = 'email'
          }
          
          // Get guest name: use stored guest_name, or lookup from guest maps
          let guestName: string | undefined = log.guest_name
          if (!guestName) {
            // Try to find guest by ID (if recipient_id is a UUID)
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(log.recipient_id))
            if (isUUID) {
              const found = guestById.get(String(log.recipient_id))
              if (found) guestName = found
            }
            // Try by email
            if (!guestName && log.recipient_email) {
              const found = guestByEmail.get(String(log.recipient_email))
              if (found) guestName = found
            }
            // Try by phone
            if (!guestName && log.recipient_phone) {
              const found = guestByPhone.get(String(log.recipient_phone))
              if (found) guestName = found
            }
          }
          
          return {
            ...log,
            log_source: 'notification_logs',
            sent_at: log.delivered_at || log.created_at,
            success: log.status === 'delivered',
            email: log.recipient_email,
            channel: determinedChannel,
            guest_name: guestName,
          }
        })
        
        // Apply channel filtering in memory for backward compatibility
        if (channel) {
          notificationLogs = notificationLogs.filter((log) => log.channel === channel)
          // Recalculate count after filtering
          notificationLogsCount = notificationLogs.length
        }
      }
    }

    // Combine and sort by sent_at (most recent first)
    const allLogs = [...mailLogs, ...notificationLogs].sort((a, b) => {
      const dateA = new Date(a.sent_at || a.delivered_at || a.created_at || 0).getTime()
      const dateB = new Date(b.sent_at || b.delivered_at || b.created_at || 0).getTime()
      return dateB - dateA
    })

    // Calculate summary statistics
    const successfulLogs = allLogs.filter(log => {
      const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
      return isSuccess
    })
    const failedLogs = allLogs.filter(log => {
      const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
      return !isSuccess
    })

    // Fetch all guests with their invitation events count and invitation IDs
    const { data: guestsWithInvitations } = await supabase
      .from('guests')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        invitations(
          id,
          invitation_events(
            id,
            event_id
          )
        )
      `)
      .eq('wedding_id', weddingId)

    // Create map of guest ID to invitation events count, invitation IDs, and event IDs
    const guestInvitationEventsCount = new Map<string, number>()
    const guestInvitationIds = new Map<string, string[]>()
    const guestInvitationEventIds = new Map<string, Map<string, string[]>>() // Map<guestId, Map<invitationId, eventIds[]>>
    const guestInfoMap = new Map<string, { name: string; email?: string; phone?: string }>()
    
    guestsWithInvitations?.forEach((guest: any) => {
      const guestId = guest.id
      const guestName = `${guest.first_name} ${guest.last_name}`.trim()
      const invitations = guest.invitations || []
      const totalEvents = invitations.reduce((sum: number, inv: any) => {
        return sum + (inv.invitation_events?.length || 0)
      }, 0)
      const invitationIds = invitations.map((inv: any) => inv.id)
      
      // Map invitation IDs to event IDs
      const invitationEventIdsMap = new Map<string, string[]>()
      invitations.forEach((inv: any) => {
        const eventIds = inv.invitation_events?.map((ie: any) => ie.event_id) || []
        invitationEventIdsMap.set(inv.id, eventIds)
      })
      
      guestInvitationEventsCount.set(guestId, totalEvents)
      guestInvitationIds.set(guestId, invitationIds)
      guestInvitationEventIds.set(guestId, invitationEventIdsMap)
      guestInfoMap.set(guestId, {
        name: guestName,
        email: guest.email,
        phone: guest.phone,
      })
      
      // Also map by email and phone for lookup
      if (guest.email) {
        guestInfoMap.set(guest.email, {
          name: guestName,
          email: guest.email,
          phone: guest.phone,
        })
      }
      if (guest.phone) {
        guestInfoMap.set(guest.phone, {
          name: guestName,
          email: guest.email,
          phone: guest.phone,
        })
      }
    })

    // Group logs by guest
    const guestLogsMap = new Map<string, any[]>()
    const guestKeyToGuestId = new Map<string, string>()
    
    allLogs.forEach(log => {
      // Try to find guest ID from various identifiers
      let guestId: string | undefined
      let guestKey: string | undefined
      
      // Try by recipient_id if it's a UUID
      if (log.recipient_id) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(log.recipient_id))
        if (isUUID && guestInvitationEventsCount.has(log.recipient_id)) {
          guestId = log.recipient_id
        }
      }
      
      // Try by email
      if (!guestId && log.email) {
        const guestInfo = guestInfoMap.get(log.email)
        if (guestInfo) {
          // Find guest ID by email
          const guest = guestsWithInvitations?.find((g: any) => g.email === log.email)
          if (guest) {
            guestId = guest.id
          }
        }
      }
      
      // Try by phone
      if (!guestId && log.recipient_phone) {
        const guestInfo = guestInfoMap.get(log.recipient_phone)
        if (guestInfo) {
          const guest = guestsWithInvitations?.find((g: any) => g.phone === log.recipient_phone)
          if (guest) {
            guestId = guest.id
          }
        }
      }
      
      // Use guest_name as fallback key
      if (!guestId) {
        guestKey = log.guest_name || log.email || log.recipient_email || log.recipient_phone || 'Unknown'
      } else {
        guestKey = guestId
      }
      
      if (guestKey && !guestLogsMap.has(guestKey)) {
        guestLogsMap.set(guestKey, [])
        if (guestId) {
          guestKeyToGuestId.set(guestKey, guestId)
        }
      }
      if (guestKey) {
        guestLogsMap.get(guestKey)?.push(log)
      }
    })

    // Create grouped guest data from logs
    const groupedByGuestFromLogs = Array.from(guestLogsMap.entries()).map(([guestKey, logs]) => {
      const guestId = guestKeyToGuestId.get(guestKey)
      const guestInfo = guestId ? guestInfoMap.get(guestId) : guestInfoMap.get(guestKey)
      const invitationEventsCount = guestId ? (guestInvitationEventsCount.get(guestId) || 0) : 0
      
      const successful = logs.filter(log => {
        const isSuccess = log.success !== undefined ? log.success : log.status === 'delivered'
        return isSuccess
      }).length
      const failed = logs.length - successful
      const lastNotification = logs.length > 0 ? logs[0].sent_at || logs[0].delivered_at || logs[0].created_at : null
      
      const notificationsReceived = logs.length
      const missingCount = Math.max(0, invitationEventsCount - notificationsReceived)
      
      const invitationIds = guestId ? (guestInvitationIds.get(guestId) || []) : []
      const invitationEventIdsMap = guestId ? (guestInvitationEventIds.get(guestId) || new Map()) : new Map()
      
      // Create map of invitation IDs to event IDs
      const invitationEventIds: Record<string, string[]> = {}
      invitationEventIdsMap.forEach((eventIds, invId) => {
        invitationEventIds[invId] = eventIds
      })
      
      return {
        guest_id: guestId,
        guest_name: guestInfo?.name || guestKey,
        guest_email: guestInfo?.email || logs[0]?.email || logs[0]?.recipient_email,
        guest_phone: guestInfo?.phone || logs[0]?.recipient_phone,
        invitation_events_count: invitationEventsCount,
        notifications_received: notificationsReceived,
        missing_count: missingCount,
        successful,
        failed,
        last_notification: lastNotification,
        invitation_ids: invitationIds,
        invitation_event_ids: invitationEventIds, // Map of invitation ID to event IDs
        logs: logs.slice(0, 10),
      }
    })

    // Add guests who have invitation events but no notifications
    const guestsWithLogs = new Set(groupedByGuestFromLogs.map(g => g.guest_id).filter(Boolean))
    const guestsWithoutNotifications = guestsWithInvitations?.filter((guest: any) => {
      const guestId = guest.id
      const hasInvitations = guest.invitations && guest.invitations.length > 0
      const hasLogs = guestsWithLogs.has(guestId)
      return hasInvitations && !hasLogs
    }) || []

    const guestsWithoutNotificationsData = guestsWithoutNotifications.map((guest: any) => {
      const guestId = guest.id
      const guestName = `${guest.first_name} ${guest.last_name}`.trim()
      const invitations = guest.invitations || []
      const totalEvents = invitations.reduce((sum: number, inv: any) => {
        return sum + (inv.invitation_events?.length || 0)
      }, 0)
      const invitationIds = invitations.map((inv: any) => inv.id)

      // Get event IDs for invitations
      const invitationEventIdsMap = new Map<string, string[]>()
      invitations.forEach((inv: any) => {
        const eventIds = inv.invitation_events?.map((ie: any) => ie.event_id) || []
        invitationEventIdsMap.set(inv.id, eventIds)
      })
      
      const invitationEventIds: Record<string, string[]> = {}
      invitationEventIdsMap.forEach((eventIds, invId) => {
        invitationEventIds[invId] = eventIds
      })
      
      return {
        guest_id: guestId,
        guest_name: guestName,
        guest_email: guest.email,
        guest_phone: guest.phone,
        invitation_events_count: totalEvents,
        notifications_received: 0,
        missing_count: totalEvents, // All events are missing notifications
        successful: 0,
        failed: 0,
        last_notification: null,
        invitation_ids: invitationIds,
        invitation_event_ids: invitationEventIds,
        logs: [],
      }
    })

    // Combine and sort
    const groupedByGuest = [...groupedByGuestFromLogs, ...guestsWithoutNotificationsData].sort((a, b) => {
      // Sort by missing count first (highest first), then by last notification date
      if (a.missing_count !== b.missing_count) {
        return b.missing_count - a.missing_count
      }
      const dateA = a.last_notification ? new Date(a.last_notification).getTime() : 0
      const dateB = b.last_notification ? new Date(b.last_notification).getTime() : 0
      return dateB - dateA
    })

    // Count unique guests notified
    const uniqueGuestsNotified = new Set(
      allLogs
        .map(log => log.guest_name || log.email || log.recipient_email || log.recipient_phone)
        .filter(Boolean)
    ).size

    // Count guests with missing notifications
    const guestsWithMissingNotifications = groupedByGuest.filter(
      guest => guest.missing_count > 0
    ).length

    // Calculate total count and pagination
    const totalCount = mailLogsCount + notificationLogsCount
    const totalPages = Math.ceil(totalCount / pageSize)
    
    // Apply pagination to combined results
    const paginatedLogs = allLogs.slice(offset, offset + pageSize)

    return NextResponse.json({
      success: true,
      logs: paginatedLogs,
      pagination: {
        page,
        page_size: pageSize,
        total_count: totalCount,
        total_pages: totalPages,
      },
      summary: {
        total_sent: allLogs.length,
        successful: successfulLogs.length,
        failed: failedLogs.length,
        unique_guests_notified: uniqueGuestsNotified,
        total_guests: guestsWithInvitations?.length || 0,
        guests_with_missing_notifications: guestsWithMissingNotifications,
      },
      grouped_by_guest: groupedByGuest,
    })
  } catch (error) {
    console.error('Error fetching notification logs:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notification logs',
      },
      { status: 500 }
    )
  }
}
