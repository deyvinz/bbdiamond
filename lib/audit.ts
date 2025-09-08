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
    
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        action,
        details,
        user_id,
        ip_address,
        user_agent,
        created_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Failed to log admin action:', error)
    }
  } catch (error) {
    console.error('Audit logging error:', error)
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
