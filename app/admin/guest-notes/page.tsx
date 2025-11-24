import { redirect } from 'next/navigation'
import { getWeddingContext } from '@/lib/wedding-context-server'
import GuestNotesAdminClient from './GuestNotesAdminClient'
import { getAllGuestNotes } from '@/lib/guest-notes-service'

export default async function GuestNotesAdminPage() {
  const context = await getWeddingContext()
  
  if (!context) {
    redirect('/admin')
  }

  const notes = await getAllGuestNotes(context.weddingId)

  return <GuestNotesAdminClient initialNotes={notes} />
}

