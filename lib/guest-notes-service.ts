import { supabaseServer } from './supabase-server'
import { getWeddingId } from './wedding-context-server'

export interface GuestNote {
  id: string
  wedding_id: string
  guest_id?: string | null
  guest_name?: string | null
  message: string
  is_approved: boolean
  created_at: string
  updated_at: string
}

export interface CreateGuestNoteInput {
  guest_id?: string
  guest_name?: string
  message: string
}

export async function getApprovedGuestNotes(weddingId?: string): Promise<GuestNote[]> {
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    return []
  }

  const supabase = await supabaseServer()

  const { data: notes, error } = await supabase
    .from('guest_notes')
    .select('*')
    .eq('wedding_id', resolvedWeddingId)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching guest notes:', error)
    return []
  }

  return notes || []
}

export async function getAllGuestNotes(weddingId?: string): Promise<GuestNote[]> {
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    return []
  }

  const supabase = await supabaseServer()

  const { data: notes, error } = await supabase
    .from('guest_notes')
    .select('*')
    .eq('wedding_id', resolvedWeddingId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching all guest notes:', error)
    return []
  }

  return notes || []
}

export async function createGuestNote(
  noteData: CreateGuestNoteInput,
  weddingId?: string
): Promise<GuestNote> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to create guest notes')
  }

  if (!noteData.message || !noteData.message.trim()) {
    throw new Error('Message is required')
  }

  const { data: note, error } = await supabase
    .from('guest_notes')
    .insert({
      wedding_id: resolvedWeddingId,
      guest_id: noteData.guest_id || null,
      guest_name: noteData.guest_name?.trim() || null,
      message: noteData.message.trim(),
      is_approved: false, // Requires moderation
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating guest note:', error)
    throw new Error(`Failed to create guest note: ${error.message}`)
  }

  return note
}

export async function updateGuestNote(
  noteId: string,
  updates: { is_approved?: boolean },
  weddingId?: string
): Promise<GuestNote> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to update guest notes')
  }

  const { data: note, error } = await supabase
    .from('guest_notes')
    .update(updates)
    .eq('id', noteId)
    .eq('wedding_id', resolvedWeddingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating guest note:', error)
    throw new Error(`Failed to update guest note: ${error.message}`)
  }

  if (!note) {
    throw new Error('Guest note not found')
  }

  return note
}

export async function deleteGuestNote(noteId: string, weddingId?: string): Promise<void> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to delete guest notes')
  }

  const { error } = await supabase
    .from('guest_notes')
    .delete()
    .eq('id', noteId)
    .eq('wedding_id', resolvedWeddingId)

  if (error) {
    console.error('Error deleting guest note:', error)
    throw new Error(`Failed to delete guest note: ${error.message}`)
  }
}

