'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { 
  createInvitationsForGuests,
  updateInvitation,
  deleteInvitations,
  regenerateInviteToken,
  regenerateEventToken,
  sendInviteEmail,
  importInvitationsFromCsv,
  type CreateInvitationInput,
  type UpdateInvitationInput,
  type CsvInvitationInput,
  type SendEmailInput
} from '@/lib/invitations-service'
import { submitRsvp } from '@/lib/rsvp-service'
import { logInvitationAction } from '@/lib/audit'

export async function createInvitationsAction(data: CreateInvitationInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can create invitations.')
  }

  try {
    const invitations = await createInvitationsForGuests(data.guest_ids, data.events)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, invitations }
  } catch (error) {
    console.error('Create invitations action failed:', error)
    throw new Error(`Failed to create invitations: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function updateInvitationAction(invitationId: string, data: UpdateInvitationInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can update invitations.')
  }

  try {
    const invitation = await updateInvitation(invitationId, data)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, invitation }
  } catch (error) {
    console.error('Update invitation action failed:', error)
    throw new Error(`Failed to update invitation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function deleteInvitationsAction(invitationIds: string[]) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can delete invitations.')
  }

  try {
    await deleteInvitations(invitationIds)
    
    revalidatePath('/admin/invitations')
    
    return { success: true }
  } catch (error) {
    console.error('Delete invitations action failed:', error)
    throw new Error(`Failed to delete invitations: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function regenerateInviteTokenAction(invitationId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can regenerate tokens.')
  }

  try {
    const newToken = await regenerateInviteToken(invitationId)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, token: newToken }
  } catch (error) {
    console.error('Regenerate invite token action failed:', error)
    throw new Error(`Failed to regenerate token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function regenerateEventTokenAction(invitationEventId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can regenerate tokens.')
  }

  try {
    const newToken = await regenerateEventToken(invitationEventId)
    
    revalidatePath('/admin/invitations')
    
    return { success: true, token: newToken }
  } catch (error) {
    console.error('Regenerate event token action failed:', error)
    throw new Error(`Failed to regenerate token: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function sendInviteEmailAction(data: SendEmailInput) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can send emails.')
  }

  try {
    const result = await sendInviteEmail(data)
    
    revalidatePath('/admin/invitations')
    
    return result
  } catch (error) {
    console.error('Send invite email action failed:', error)
    throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function importInvitationsAction(data: CsvInvitationInput[]) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can import invitations.')
  }

  try {
    const result = await importInvitationsFromCsv(data)
    
    revalidatePath('/admin/invitations')
    
    return result
  } catch (error) {
    console.error('Import invitations action failed:', error)
    throw new Error(`Failed to import invitations: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

export async function resendRsvpConfirmationAction(invitationId: string) {
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/sign-in')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin' && profile?.role !== 'staff') {
    throw new Error('Unauthorized: Only admin or staff can resend RSVP confirmations.')
  }

  try {
    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        id,
        token,
        guest:guests!inner(
          invite_code,
          email
        ),
        invitation_events!inner(
          status
        )
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      throw new Error('Invitation not found')
    }

    // Check if there are any accepted events
    const acceptedEvents = invitation.invitation_events.filter((event: any) => event.status === 'accepted')
    if (acceptedEvents.length === 0) {
      throw new Error('This invitation has no accepted events to resend confirmation for')
    }

    // Prepare the data for resending
    const rsvpData = {
      invite_code: invitation.guest.invite_code,
      response: 'accepted' as const,
      email: invitation.guest.email,
    }

    // Resend the RSVP confirmation
    console.log('Resending RSVP confirmation for invitation:', invitationId)
    console.log('RSVP data:', rsvpData)
    
    const result = await submitRsvp(rsvpData, user.id)
    
    console.log('Submit RSVP result:', result)
    
    if (!result.success) {
      throw new Error(result.message)
    }
    
    // Log the action
    await logInvitationAction(
      'resend_rsvp_confirmation',
      { invitationId },
      user.id,
      undefined,
      undefined
    )

    revalidatePath('/admin/invitations')
    
    return { success: true }
  } catch (error) {
    console.error('Resend RSVP confirmation action failed:', error)
    throw new Error(`Failed to resend RSVP confirmation: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
