import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { generateInvitationQR } from '@/lib/qr'
import { generateDigitalPass } from '@/lib/digital-pass'
import { getWeddingIdFromRequest } from '@/lib/api-wedding-context'

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
    
    // Try to get wedding ID (optional for public RSVP routes)
    const weddingId = await getWeddingIdFromRequest(request)

    // Find invitation by token or invite code
    let invitation
    let guest = null
    
    if (token) {
      let query = supabase
        .from('invitations')
        .select(`
          id,
          token,
          guest_id,
          wedding_id,
          invitation_events!inner(
            id,
            status,
            headcount,
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
      
      if (weddingId) {
        query = query.eq('wedding_id', weddingId)
      }
      
      const { data, error } = await query.single()

      if (error || !data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invitation not found' 
        }, { status: 404 })
      }
      invitation = data
      
      const finalWeddingId = weddingId || data.wedding_id
      
      // Fetch guest details separately
      if (data.guest_id) {
        let guestQuery = supabase
          .from('guests')
          .select('invite_code, email, first_name, last_name')
          .eq('id', data.guest_id)
        
        if (finalWeddingId) {
          guestQuery = guestQuery.eq('wedding_id', finalWeddingId)
        }
        
        const { data: guestData, error: guestError } = await guestQuery.single()
        
        if (!guestError) {
          guest = guestData
        }
      }
    } else {
      // Find by invite code
      let query = supabase
        .from('invitations')
        .select(`
          id,
          token,
          guest_id,
          wedding_id,
          invitation_events!inner(
            id,
            status,
            headcount,
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
      
      if (weddingId) {
        query = query.eq('wedding_id', weddingId)
      }
      
      const { data, error } = await query.single()

      if (error || !data) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invitation not found' 
        }, { status: 404 })
      }
      invitation = data
      
      const finalWeddingId = weddingId || data.wedding_id
      
      // Fetch guest details separately
      if (data.guest_id) {
        let guestQuery = supabase
          .from('guests')
          .select('invite_code, email, first_name, last_name')
          .eq('id', data.guest_id)
        
        if (finalWeddingId) {
          guestQuery = guestQuery.eq('wedding_id', finalWeddingId)
        }
        
        const { data: guestData, error: guestError } = await guestQuery.single()
        
        if (!guestError) {
          guest = guestData
        }
      }
    }

    if (!guest) {
      return NextResponse.json({ 
        success: false, 
        error: 'Guest not found' 
      }, { status: 404 })
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

    const guestName = `${guest.first_name} ${guest.last_name}`
    
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
        const finalWeddingId = weddingId || invitation.wedding_id
        if (!finalWeddingId) {
          throw new Error('Wedding ID not found')
        }
        
        // Generate QR code
        const qrResult = await generateInvitationQR(invitation.token, {
          width: 200,
          margin: 2
        })
        qrImageUrl = `data:image/png;base64,${qrResult.buffer.toString('base64')}`

        // Fetch RSVP guests for accepted events
        const invitationEventIds = acceptedEvents.map((ie: any) => ie.id)
        let rsvpGuestsMap: Record<string, Array<{ guest_index: number; name?: string; food_choice?: string }>> = {}
        
        if (invitationEventIds.length > 0) {
          const { data: rsvpGuests } = await supabase
            .from('rsvp_guests')
            .select('invitation_event_id, guest_index, name, food_choice')
            .in('invitation_event_id', invitationEventIds)
            .order('invitation_event_id')
            .order('guest_index')
          
          if (rsvpGuests) {
            for (const guest of rsvpGuests) {
              if (!rsvpGuestsMap[guest.invitation_event_id]) {
                rsvpGuestsMap[guest.invitation_event_id] = []
              }
              rsvpGuestsMap[guest.invitation_event_id].push({
                guest_index: guest.guest_index,
                name: guest.name || undefined,
                food_choice: guest.food_choice || undefined,
              })
            }
          }
        }
        
        // Fetch couple display name
        let coupleDisplayName: string | undefined
        try {
          const { data: weddingData } = await supabase
            .from('weddings')
            .select('couple_display_name')
            .eq('id', finalWeddingId)
            .single()
          coupleDisplayName = weddingData?.couple_display_name
        } catch (error) {
          console.warn('Failed to fetch couple display name:', error)
        }

        // Generate digital pass
        const passData = {
          guestName,
          inviteCode: guest.invite_code,
          token: invitation.token,
          weddingId: finalWeddingId,
          coupleDisplayName,
          events: acceptedEvents.map((ie: any) => ({
            name: ie.event.name,
            startsAtISO: ie.event.starts_at,
            venue: ie.event.venue,
            address: ie.event.address,
            invitationEventId: ie.id,
            headcount: ie.headcount,
            rsvpGuests: rsvpGuestsMap[ie.id] || undefined,
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
