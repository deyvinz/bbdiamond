import { supabaseServer } from './supabase-server'
import { generateInvitationQR } from './qr'

export interface DigitalPassData {
  guestName: string
  inviteCode: string
  token: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
  }>
}

export interface DigitalPassResult {
  publicUrl: string
  base64Content: string
  buffer: Buffer
}

/**
 * Generate a digital access card/pass as PDF
 */
export async function generateDigitalPass(
  data: DigitalPassData
): Promise<DigitalPassResult> {
  try {
    // Generate QR code for the pass
    const qrResult = await generateInvitationQR(data.token, {
      width: 200,
      margin: 2
    })

    // Format events for display
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
      const eventTime = timePart ? timePart.substring(0, 5) : '00:00' // Extract HH:MM
      const formattedEventDateTime = `${eventDate} · ${eventTime}`
      
      return {
        ...event,
        formattedDate: eventDate,
        formattedTime: eventTime,
        formattedDateTime: formattedEventDateTime,
      }
    })

    // Generate HTML for the pass
    const html = generatePassHTML(data, formattedEvents, qrResult.dataUrl)
    
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
  }>,
  qrDataUrl: string
): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
  
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
            background: linear-gradient(90deg, #C7A049 0%, #D4AF37 50%, #C7A049 100%);
        }
        
        .wedding-logo {
            max-width: 200px;
            height: auto;
            margin: 0 auto 16px auto;
            display: block;
        }
        
        .wedding-title {
            font-size: 18px;
            color: #C7A049;
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
            border: 2px solid #C7A049;
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
            border: 3px solid #C7A049;
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
            border-bottom: 2px solid #C7A049;
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
            color: #C7A049;
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
            <img src="https://brendabagsherdiamond.com/images/logo.png" alt="Brenda & Diamond Wedding" class="wedding-logo">
            <div class="wedding-title">Wedding Celebration</div>
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
            ${formattedEvents.map(event => `
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
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div class="footer">
            <p>Visit our website: <a href="${baseUrl}" class="website-url">${baseUrl}</a></p>
        </div>
    </div>
</body>
</html>
  `.trim()
}
