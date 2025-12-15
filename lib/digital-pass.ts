import { supabaseServer } from './supabase-server'
import { generateInvitationQR } from './qr'
import { getWeddingTheme, getDefaultTheme } from './theme-service'
import { getWebsiteUrl } from './email-service'

export interface DigitalPassData {
  guestName: string
  inviteCode: string
  token: string
  weddingId: string
  coupleDisplayName?: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
    invitationEventId?: string
    headcount?: number
    rsvpGuests?: Array<{
      guest_index: number
      name?: string
      food_choice?: string
    }>
  }>
}

export interface DigitalPassResult {
  publicUrl: string
  base64Content: string
  buffer: Buffer
}

/**
 * Fetch RSVP guests for invitation events
 */
async function fetchRsvpGuestsForEvents(
  invitationEventIds: string[]
): Promise<Record<string, Array<{ guest_index: number; name?: string; food_choice?: string }>>> {
  if (invitationEventIds.length === 0) {
    return {}
  }

  try {
    const supabase = await supabaseServer()
    const { data, error } = await supabase
      .from('rsvp_guests')
      .select('invitation_event_id, guest_index, name, food_choice')
      .in('invitation_event_id', invitationEventIds)
      .order('invitation_event_id')
      .order('guest_index')

    if (error || !data) {
      console.warn('Failed to fetch rsvp_guests:', error)
      return {}
    }

    // Group by invitation_event_id
    const guestsMap: Record<string, Array<{ guest_index: number; name?: string; food_choice?: string }>> = {}
    for (const guest of data) {
      if (!guestsMap[guest.invitation_event_id]) {
        guestsMap[guest.invitation_event_id] = []
      }
      guestsMap[guest.invitation_event_id].push({
        guest_index: guest.guest_index,
        name: guest.name || undefined,
        food_choice: guest.food_choice || undefined,
      })
    }

    return guestsMap
  } catch (error) {
    console.error('Error fetching rsvp_guests:', error)
    return {}
  }
}

/**
 * Generate a digital access card/pass as PDF
 */
export async function generateDigitalPass(
  data: DigitalPassData
): Promise<DigitalPassResult> {
  try {
    // Fetch wedding theme and website URL
    const [themeResult, websiteUrlResult] = await Promise.all([
      getWeddingTheme(data.weddingId).catch(() => null),
      getWebsiteUrl(data.weddingId).catch(() => null),
    ])
    
    // Ensure theme is never null - use default if not found
    const theme: ReturnType<typeof getDefaultTheme> = themeResult || getDefaultTheme()
    
    // Ensure websiteUrl is always a string
    const defaultWebsiteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luwani.com'
    const websiteUrl: string = websiteUrlResult || defaultWebsiteUrl

    // Fetch couple display name if not provided
    let coupleDisplayName: string = data.coupleDisplayName || 'Wedding Celebration'
    if (!data.coupleDisplayName) {
      try {
        const supabase = await supabaseServer()
        const { data: weddingData } = await supabase
          .from('weddings')
          .select('couple_display_name')
          .eq('id', data.weddingId)
          .single()
        coupleDisplayName = weddingData?.couple_display_name || 'Wedding Celebration'
      } catch (error) {
        console.warn('Failed to fetch couple display name:', error)
        coupleDisplayName = 'Wedding Celebration'
      }
    }

    // Fetch RSVP guests for events that have invitationEventId
    const invitationEventIds = data.events
      .map(e => e.invitationEventId)
      .filter((id): id is string => Boolean(id))
    
    const rsvpGuestsMap = await fetchRsvpGuestsForEvents(invitationEventIds)

    // Generate QR code for the pass
    const qrResult = await generateInvitationQR(data.token, {
      width: 200,
      margin: 2
    })

    // Format events for display and attach RSVP guests data
    const formattedEvents = data.events.map(event => {
      // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
      const [datePart, timePart] = event.startsAtISO.split(' ')
      const [year, month, day] = datePart.split('-')
      const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      let eventTime = '00:00 AM'
      if (timePart) {
        const [hourStr, minuteStr] = timePart.split(':')
        let hour = parseInt(hourStr, 10)
        const minute = minuteStr ? minuteStr.padStart(2, '0') : '00'
        const ampm = hour >= 12 ? 'PM' : 'AM'
        hour = hour % 12 || 12 // Convert 0/12/24 to 12-hour format
        eventTime = `${hour}:${minute} ${ampm}`
      }
      const formattedEventDateTime = `${eventDate} · ${eventTime}`
      
      // Attach RSVP guests if available
      const rsvpGuests = event.invitationEventId 
        ? rsvpGuestsMap[event.invitationEventId] || event.rsvpGuests
        : event.rsvpGuests
      
      return {
        ...event,
        formattedDate: eventDate,
        formattedTime: eventTime,
        formattedDateTime: formattedEventDateTime,
        rsvpGuests: rsvpGuests || [],
        headcount: event.headcount || (rsvpGuests?.length || 1),
      }
    })

    // Generate HTML for the pass
    const html = generatePassHTML(data, formattedEvents, qrResult.dataUrl, theme, websiteUrl, coupleDisplayName)
    
    // For now, we'll generate a simple HTML-based pass
    // In a production environment, you might want to use a PDF generation library like Puppeteer
    const buffer = Buffer.from(html, 'utf-8')
    const base64Content = buffer.toString('base64')

    // Try to upload to Supabase Storage, but don't fail if it doesn't work
    let publicUrl: string | undefined
    try {
      const supabase = await supabaseServer()
      const fileName = `passes/INVITE_${data.token}.html`
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('bdiamond')
        .upload(fileName, buffer, {
          contentType: 'text/html',
          cacheControl: '31536000', // 1 year
          upsert: true
        })

      if (!uploadError && uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('bdiamond')
          .getPublicUrl(fileName)
        publicUrl = publicUrlData.publicUrl
      } else {
        console.warn('Failed to upload digital pass to storage, using data URL:', uploadError)
        // Fallback to data URL
        publicUrl = `data:text/html;base64,${base64Content}`
      }
    } catch (error) {
      console.warn('Storage upload failed, using data URL fallback:', error)
      // Fallback to data URL
      publicUrl = `data:text/html;base64,${base64Content}`
    }

    return {
      publicUrl: publicUrl!,
      base64Content,
      buffer
    }
  } catch (error) {
    console.error('Digital pass generation error:', error)
    throw new Error('Failed to generate digital pass')
  }
}

/**
 * Generate HTML for the digital pass
 */
function generatePassHTML(
  data: DigitalPassData,
  formattedEvents: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
    formattedDate: string
    formattedTime: string
    formattedDateTime: string
    rsvpGuests?: Array<{
      guest_index: number
      name?: string
      food_choice?: string
    }>
    headcount?: number
  }>,
  qrDataUrl: string,
  theme: ReturnType<typeof getDefaultTheme>,
  websiteUrl: string,
  coupleDisplayName: string
): string {
  const baseUrl = websiteUrl
  const primaryColor = theme.primary_color || theme.gold_500 || '#C7A049'
  const logoUrl = theme.email_logo_url || theme.logo_url || null
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wedding Access Pass - ${data.guestName}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .pass-container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #111111 0%, #2c2c2c 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
            position: relative;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 4px;
            background: linear-gradient(90deg, ${primaryColor} 0%, ${theme.gold_400 || primaryColor} 50%, ${primaryColor} 100%);
        }
        
        .wedding-logo {
            max-width: 200px;
            height: auto;
            margin: 0 auto 16px auto;
            display: block;
        }
        
        .wedding-title {
            font-size: 18px;
            color: ${primaryColor};
            font-weight: 300;
            letter-spacing: 3px;
            text-transform: uppercase;
        }
        
        .guest-info {
            padding: 40px 30px;
            text-align: center;
        }
        
        .guest-name {
            font-size: 28px;
            font-weight: bold;
            color: #111111;
            margin-bottom: 16px;
        }
        
        .invite-code {
            background: #f8f9fa;
            border: 2px solid ${primaryColor};
            border-radius: 8px;
            padding: 16px 24px;
            display: inline-block;
            margin-bottom: 30px;
        }
        
        .invite-code-label {
            font-size: 14px;
            color: #666;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .invite-code-value {
            font-size: 24px;
            font-weight: bold;
            color: #111111;
            font-family: monospace;
            letter-spacing: 2px;
        }
        
        .qr-section {
            text-align: center;
            margin: 30px 0;
        }
        
        .qr-code {
            width: 200px;
            height: 200px;
            border: 3px solid ${primaryColor};
            border-radius: 12px;
            padding: 16px;
            background: white;
            display: inline-block;
        }
        
        .qr-label {
            font-size: 14px;
            color: #666;
            margin-top: 16px;
            font-weight: 500;
        }
        
        .events-section {
            padding: 0 30px 40px;
        }
        
        .events-title {
            font-size: 20px;
            font-weight: bold;
            color: #111111;
            text-align: center;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 2px solid ${primaryColor};
        }
        
        .guests-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid #e9ecef;
        }
        
        .guests-title {
            font-size: 16px;
            font-weight: bold;
            color: #111111;
            margin-bottom: 12px;
        }
        
        .guest-item {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .guest-label {
            font-weight: 600;
            color: #666;
            min-width: 100px;
        }
        
        .guest-name {
            color: #111111;
            flex: 1;
        }
        
        .food-choice {
            color: ${primaryColor};
            font-weight: 500;
            margin-left: auto;
        }
        
        .event-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 16px;
        }
        
        .event-name {
            font-size: 18px;
            font-weight: bold;
            color: #111111;
            margin-bottom: 8px;
        }
        
        .event-details {
            font-size: 14px;
            color: #666;
            line-height: 1.5;
        }
        
        .event-detail-row {
            margin-bottom: 4px;
        }
        
        .event-detail-label {
            font-weight: 600;
            color: #111111;
        }
        
        .footer {
            background: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .website-url {
            color: ${primaryColor};
            text-decoration: none;
            font-weight: 500;
        }
        
        .website-url:hover {
            text-decoration: underline;
        }
        
        @media print {
            body {
                background: white;
                padding: 0;
            }
            
            .pass-container {
                box-shadow: none;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="pass-container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${coupleDisplayName}" class="wedding-logo">` : ''}
            <div class="wedding-title">${coupleDisplayName}</div>
        </div>
        
        <div class="guest-info">
            <div class="guest-name">${data.guestName}</div>
            <div class="invite-code">
                <div class="invite-code-label">Invite Code</div>
                <div class="invite-code-value">${data.inviteCode}</div>
            </div>
        </div>
        
        <div class="qr-section">
            <img src="${qrDataUrl}" alt="QR Code" class="qr-code" />
            <div class="qr-label">Show this QR code at check-in</div>
        </div>
        
        <div class="events-section">
            <div class="events-title">Confirmed Events</div>
            ${formattedEvents.map(event => {
              const totalGuests = event.headcount || event.rsvpGuests?.length || 1
              const hasMultipleGuests = totalGuests > 1
              const rsvpGuests = event.rsvpGuests || []
              
              return `
                <div class="event-card">
                    <div class="event-name">${event.name}</div>
                    <div class="event-details">
                        <div class="event-detail-row">
                            <span class="event-detail-label">📅 Date & Time:</span> ${event.formattedDateTime}
                        </div>
                        <div class="event-detail-row">
                            <span class="event-detail-label">📍 Venue:</span> ${event.venue}
                        </div>
                        ${event.address ? `
                        <div class="event-detail-row">
                            <span class="event-detail-label">🏠 Address:</span> ${event.address}
                        </div>
                        ` : ''}
                        ${hasMultipleGuests ? `
                        <div class="event-detail-row">
                            <span class="event-detail-label">👥 Guests:</span> ${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}
                        </div>
                        ` : ''}
                    </div>
                    ${rsvpGuests.length > 0 ? `
                    <div class="guests-section">
                        <div class="guests-title">Guest Information</div>
                        ${rsvpGuests.map(guest => {
                          const guestName = guest.guest_index === 1 
                            ? data.guestName 
                            : (guest.name || `Guest ${guest.guest_index}`)
                          return `
                            <div class="guest-item">
                                <span class="guest-label">${guest.guest_index === 1 ? 'Primary Guest' : `Guest ${guest.guest_index}`}:</span>
                                <span class="guest-name">${guestName}</span>
                                ${guest.food_choice ? `<span class="food-choice">🍽️ ${guest.food_choice}</span>` : ''}
                            </div>
                          `
                        }).join('')}
                    </div>
                    ` : ''}
                </div>
              `
            }).join('')}
        </div>
        
        <div class="footer">
            <p>Visit our website: <a href="${baseUrl}" class="website-url">${baseUrl}</a></p>
        </div>
    </div>
</body>
</html>
  `.trim()
}
