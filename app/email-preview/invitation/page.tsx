import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { InvitationEmail } from '@/emails/InvitationEmail'
import { render } from '@react-email/render'

interface EmailPreviewPageProps {
  searchParams: Promise<{
    invitationId?: string
    eventId?: string
  }>
}

export default async function EmailPreviewPage({ searchParams }: EmailPreviewPageProps) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    redirect('/admin')
  }

  const resolvedSearchParams = await searchParams
  const { invitationId, eventId } = resolvedSearchParams

  if (!invitationId) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Email Preview</h1>
        <p className="text-gray-600">
          Add ?invitationId=...&eventId=... to the URL to preview an invitation email.
        </p>
      </div>
    )
  }

  try {
    const supabase = await supabaseServer()
    
    // Get invitation details
    const { data: invitation, error: invitationError } = await supabase
      .from('invitations')
      .select(`
        *,
        guest:guests(email, first_name, last_name, invite_code),
        invitation_events(
          *,
          event:events(name, starts_at, venue, address)
        ).order('event.starts_at', { foreignTable: 'events' })
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError || !invitation) {
      return (
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Email Preview</h1>
          <p className="text-red-600">Invitation not found</p>
        </div>
      )
    }

    // Determine which event to use
    let event
    if (eventId) {
      event = invitation.invitation_events?.find((ie: any) => ie.event_id === eventId)
    } else {
      event = invitation.invitation_events?.[0]
    }

    if (!event) {
      return (
        <div className="container mx-auto py-8">
          <h1 className="text-2xl font-bold mb-4">Email Preview</h1>
          <p className="text-red-600">Event not found</p>
        </div>
      )
    }

    // Prepare email props
    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    const eventDate = new Date(event.event.starts_at).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Lagos',
    })
    const eventTime = new Date(event.event.starts_at).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Africa/Lagos',
    })
    const formattedEventDate = `${eventDate} · ${eventTime}`
    
    const rsvpUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'}/rsvp?token=${invitation.token}&eventId=${event.event_id}`
    const qrImageUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'}/api/qr?token=${invitation.token}&eventId=${event.event_id}`

    const emailProps = {
      guestName,
      inviteCode: invitation.guest.invite_code,
      rsvpUrl,
      eventName: event.event.name,
      eventDate: formattedEventDate,
      eventVenue: event.event.venue,
      eventAddress: event.event.address,
      qrImageUrl,
      addToCalendarUrl: rsvpUrl,
      contactEmail: "hello@brendabagsherdiamond.com",
      replyToEmail: "hello@brendabagsherdiamond.com",
    }

    // Render email
    const html = await render(InvitationEmail(emailProps))

    return (
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Email Preview</h1>
          <p className="text-gray-600">
            Preview for {guestName} - {event.event.name}
          </p>
        </div>
        
        <div className="border rounded-lg overflow-hidden">
          <iframe
            srcDoc={html}
            className="w-full h-screen border-0"
            title="Email Preview"
          />
        </div>
      </div>
    )
  } catch (error) {
    console.error('Email preview error:', error)
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">Email Preview</h1>
        <p className="text-red-600">Error loading email preview: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    )
  }
}
