'use server'

import { supabaseServer } from '@/lib/supabase-server'
import { logAdminAction } from '@/lib/audit'

export async function sendInvitationAction(guestId: string, eventId: string) {
  const supabase = await supabaseServer()
  
  // Get invitation
  const { data: invitation, error: invitationError } = await supabase
    .from('invitations')
    .select(`
      *,
      guest:guests(email, first_name, last_name),
      event:events(name)
    `)
    .eq('guest_id', guestId)
    .eq('event_id', eventId)
    .single()

  if (invitationError || !invitation) {
    throw new Error('Invitation not found')
  }

  // Check rate limit
  const today = new Date().toISOString().split('T')[0]
  const { data: mailLogs } = await supabase
    .from('mail_logs')
    .select('*')
    .eq('token', invitation.token)
    .gte('sent_at', `${today}T00:00:00.000Z`)

  if (mailLogs && mailLogs.length >= 3) {
    throw new Error('Daily email limit exceeded for this invitation')
  }

  // Call edge function
  const { data, error } = await supabase.functions.invoke('send-qr-email', {
    body: {
      token: invitation.token,
      email: invitation.guest.email,
      guest_name: `${invitation.guest.first_name} ${invitation.guest.last_name}`,
      event_name: invitation.event.name
    }
  })

  // Log mail attempt
  await supabase
    .from('mail_logs')
    .insert({
      token: invitation.token,
      email: invitation.guest.email,
      sent_at: new Date().toISOString(),
      success: !error,
      error_message: error?.message
    })

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`)
  }

  // Log audit
  await logAdminAction('invite_email_send', {
    guest_id: guestId,
    invitation_id: invitation.id,
    email: invitation.guest.email,
    event: invitation.event.name
  })

  return { success: true, message: 'Invitation sent successfully' }
}
