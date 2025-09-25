import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateInvitationQR } from '@/lib/qr'
import { generateDigitalPass } from '@/lib/digital-pass'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const inviteCode = searchParams.get('invite_code')

    if (!token && !inviteCode) {
      return NextResponse.json({ 
        success: false, 
        error: 'Token or invite code is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Find invitation by token or invite code
    let invitation
    if (token) {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          token,
          guest:guests!inner(
            invite_code,
            email,
            first_name,
            last_name
          ),
          invitation_events!inner(
            status,
            event:events!inner(
              id,
              name,
              starts_at,
              venue,
              address
            )
          )
        `)
        .eq('token', token)
        .single()

      if (error || !data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invitation not found' 
        }, { status: 404 })
      }
      invitation = data
    } else {
      // Find by invite code
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          id,
          token,
          guest:guests!inner(
            invite_code,
            email,
            first_name,
            last_name
          ),
          invitation_events!inner(
            status,
            event:events!inner(
              id,
              name,
              starts_at,
              venue,
              address
            )
          )
        `)
        .eq('guest.invite_code', inviteCode)
        .single()

      if (error || !data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invitation not found' 
        }, { status: 404 })
      }
      invitation = data
    }

    // Check if there are any accepted events
    const acceptedEvents = invitation.invitation_events.filter((ie: any) => ie.status === 'accepted')
    const declinedEvents = invitation.invitation_events.filter((ie: any) => ie.status === 'declined')
    const pendingEvents = invitation.invitation_events.filter((ie: any) => ie.status === 'pending')

    // Determine overall status
    let overallStatus: 'accepted' | 'declined' | 'pending' = 'pending'
    if (acceptedEvents.length > 0) {
      overallStatus = 'accepted'
    } else if (declinedEvents.length > 0 && pendingEvents.length === 0) {
      overallStatus = 'declined'
    }

    const guestName = `${invitation.guest.first_name} ${invitation.guest.last_name}`
    
    // Format events for display
    const events = invitation.invitation_events.map((ie: any) => ({
      name: ie.event.name,
      startsAtISO: ie.event.starts_at,
      venue: ie.event.venue,
      address: ie.event.address
    }))

    let qrImageUrl: string | undefined
    let passUrl: string | undefined

    // Generate QR code and digital pass for accepted RSVPs
    if (overallStatus === 'accepted' && acceptedEvents.length > 0) {
      try {
        // Generate QR code
        const qrResult = await generateInvitationQR(invitation.token, {
          width: 200,
          margin: 2
        })
        qrImageUrl = `data:image/png;base64,${qrResult.buffer.toString('base64')}`

        // Generate digital pass
        const passData = {
          guestName,
          inviteCode: invitation.guest.invite_code,
          token: invitation.token,
          events: acceptedEvents.map((ie: any) => ({
            name: ie.event.name,
            startsAtISO: ie.event.starts_at,
            venue: ie.event.venue,
            address: ie.event.address
          }))
        }
        const passResult = await generateDigitalPass(passData)
        passUrl = passResult.publicUrl
      } catch (error) {
        console.error('Failed to generate QR/pass:', error)
        // Continue without QR/pass if generation fails
      }
    }

    return NextResponse.json({
      success: true,
      rsvpStatus: {
        status: overallStatus,
        guestName,
        events,
        qrImageUrl,
        passUrl
      }
    })

  } catch (error) {
    console.error('Error checking RSVP status:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to check RSVP status' 
    }, { status: 500 })
  }
}
