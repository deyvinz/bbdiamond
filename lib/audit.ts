import { supabaseServer } from '@/lib/supabase-server'

export interface AuditLogEntry {
  action: string
  details: Record<string, unknown>
  user_id?: string
  ip_address?: string
  user_agent?: string
}

export async function logAdminAction(
  action: string,
  details: Record<string, unknown>,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  try {
    const supabase = await supabaseServer()
    
    // Only include user_id if it's provided and not undefined
    const logData: any = {
      action,
      details,
      ip_address,
      user_agent,
      created_at: new Date().toISOString(),
    }
    
    if (user_id) {
      logData.user_id = user_id
    }
    
    const { error } = await supabase
      .from('audit_logs')
      .insert(logData)

    if (error) {
      console.warn('Failed to log admin action (table may not exist or have wrong structure):', error)
    }
  } catch (error) {
    console.warn('Audit logging not available:', error)
  }
}

export async function logInviteCodeBackfill(
  batchSize: number,
  dryRun: boolean,
  updated: number,
  skipped: number,
  conflictsResolved: number,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAdminAction(
    'invite_code_backfill',
    {
      batchSize,
      dryRun,
      updated,
      skipped,
      conflictsResolved,
      timestamp: new Date().toISOString(),
    },
    user_id,
    ip_address,
    user_agent
  )
}

export async function logInvitationAction(
  action: string,
  details: Record<string, unknown>,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAdminAction(action, details, user_id, ip_address, user_agent)
}

export async function logRsvpSubmit(
  invitationId: string,
  response: 'accepted' | 'declined',
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAdminAction(
    'rsvp_submit',
    {
      invitationId,
      response,
      timestamp: new Date().toISOString(),
    },
    user_id,
    ip_address,
    user_agent
  )
}

export async function logRsvpConfirmationEmailSend(
  invitationId: string,
  to: string,
  events: Array<{ name: string; startsAtISO: string; venue: string }>,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAdminAction(
    'rsvp_confirmation_email_send',
    {
      invitationId,
      to,
      events,
      timestamp: new Date().toISOString(),
    },
    user_id,
    ip_address,
    user_agent
  )
}

export async function logRsvpDeclineMessage(
  invitationId: string,
  message: string,
  user_id?: string,
  ip_address?: string,
  user_agent?: string
): Promise<void> {
  await logAdminAction(
    'rsvp_decline_message',
    {
      invitationId,
      message,
      timestamp: new Date().toISOString(),
    },
    user_id,
    ip_address,
    user_agent
  )
}