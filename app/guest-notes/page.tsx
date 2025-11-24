import { redirect } from 'next/navigation'
import { getWeddingContext } from '@/lib/wedding-context-server'
import GuestNotesClient from './GuestNotesClient'
import { getApprovedGuestNotes } from '@/lib/guest-notes-service'

export default async function GuestNotesPage() {
  const context = await getWeddingContext()
  
  if (!context) {
    redirect('/')
  }

  const { wedding } = context

  // Check if guest notes are enabled
  if (!wedding.enable_guest_notes) {
    redirect('/')
  }

  const notes = await getApprovedGuestNotes(context.weddingId)

  return <GuestNotesClient initialNotes={notes} coupleName={wedding.couple_display_name} />
}

