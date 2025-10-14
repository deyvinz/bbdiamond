import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface EmailPayload {
  to: string
  guestName: string
  invitationId: string
  token: string
  events: Array<{
    id: string
    name: string
    startsAtISO: string
    venue: string
    address: string
  }>
  rsvpUrl: string
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function generateEmailHTML(payload: EmailPayload): string {
  const { guestName, events, rsvpUrl } = payload
  
  // Sort events by start date
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime()
  )
  
  const primaryEvent = sortedEvents[0]
  const eventDate = new Date(primaryEvent.startsAtISO).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  const eventsListHTML = sortedEvents.map(event => {
    const eventDateFormatted = new Date(event.startsAtISO).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    
    return `
      <div style="background: #fff; border: 2px solid #D4AF37; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #1a1a1a; font-size: 20px; font-weight: 600;">${event.name}</h3>
        <p style="margin: 4px 0; color: #666; font-size: 15px;">
          <strong style="color: #D4AF37;">📅 When:</strong> ${eventDateFormatted}
        </p>
        <p style="margin: 4px 0; color: #666; font-size: 15px;">
          <strong style="color: #D4AF37;">📍 Where:</strong> ${event.venue}
        </p>
        ${event.address ? `<p style="margin: 4px 0; color: #888; font-size: 14px;">${event.address}</p>` : ''}
      </div>
    `
  }).join('')

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="x-priority" content="1">
      <meta name="importance" content="high">
      <title>⏰ Urgent: Please Confirm Your RSVP</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 40px 20px;">
            <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
              
              <!-- Urgent Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 16px 32px; text-align: center;">
                  <p style="margin: 0; color: #fff; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    ⚠️ URGENT - ACTION REQUIRED ⚠️
                  </p>
                </td>
              </tr>

              <!-- Logo Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); padding: 32px; text-align: center;">
                  <h1 style="margin: 0; color: #D4AF37; font-size: 32px; font-weight: 300; letter-spacing: 3px; text-transform: uppercase;">
                    Brenda & Diamond
                  </h1>
                  <div style="margin: 16px 0; height: 2px; background: linear-gradient(90deg, transparent, #D4AF37, transparent);"></div>
                  <p style="margin: 8px 0 0 0; color: #fff; font-size: 14px; letter-spacing: 2px; text-transform: uppercase;">
                    Wedding Celebration
                  </p>
                </td>
              </tr>

              <!-- Main Content -->
              <tr>
                <td style="padding: 40px 32px;">
                  
                  <h2 style="margin: 0 0 24px 0; color: #1a1a1a; font-size: 28px; font-weight: 600; text-align: center; line-height: 1.3;">
                    ⏰ Time is Running Out!<br/>
                    <span style="color: #dc2626;">Please Confirm Your RSVP</span>
                  </h2>

                   <!-- CTA Button -->
                  <table role="presentation" style="margin: 32px auto; border-collapse: collapse;">
                    <tr>
                      <td style="border-radius: 8px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
                        <a href="${rsvpUrl}" 
                           style="display: inline-block; padding: 20px 55px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1.5px solid #ffffff; border-radius: 8px;">
                          🔴 RSVP NOW - URGENT
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0 0 20px 0; color: #333; font-size: 16px; line-height: 1.6;">
                    Dear <strong style="color: #D4AF37;">${guestName}</strong>,
                  </p>

                  <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 20px; margin: 24px 0; border-radius: 8px;">
                    <p style="margin: 0 0 12px 0; color: #991b1b; font-size: 16px; font-weight: 600;">
                      ⚠️ We Haven't Heard From You Yet!
                    </p>
                    <p style="margin: 0; color: #666; font-size: 15px; line-height: 1.6;">
                      Our wedding is fast approaching, and we need to finalize important arrangements including seating, catering, and more. 
                      <strong style="color: #dc2626;">Your response is urgently needed!</strong>
                    </p>
                  </div>

                  <p style="margin: 0 0 24px 0; color: #333; font-size: 16px; line-height: 1.6;">
                    We would be honored to celebrate our special day with you. Please take a moment right now to let us know if you can join us:
                  </p>

                  <!-- Events List -->
                  <div style="margin: 32px 0;">
                    ${eventsListHTML}
                  </div>

                  <!-- Urgency Message -->
                  <div style="background: #fffbeb; border: 2px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 8px; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #92400e; font-size: 18px; font-weight: 700;">
                      ⏱️ RSVP CLOSES at 11:59 PM WAT on October 14, 2025
                    </p>
                    <p style="margin: 0; color: #78350f; font-size: 14px;">
                      We need to confirm final numbers with our vendors immediately
                    </p>
                  </div>

                  <!-- CTA Button -->
                  <table role="presentation" style="margin: 32px auto; border-collapse: collapse;">
                    <tr>
                      <td style="border-radius: 8px; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);">
                        <a href="${rsvpUrl}" 
                           style="display: inline-block; padding: 20px 55px; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; border: 1.5px solid #ffffff; border-radius: 8px;">
                          🔴 RSVP NOW - URGENT
                        </a>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 32px 0 0 0; color: #666; font-size: 14px; text-align: center; line-height: 1.6;">
                    If you're unable to attend, please let us know as soon as possible.<br/>
                    We completely understand and appreciate your response either way.
                  </p>

                  <div style="margin: 32px 0 0 0; padding-top: 24px; border-top: 1px solid #e5e5e5; text-align: center;">
                    <p style="margin: 0 0 8px 0; color: #333; font-size: 16px; font-weight: 600;">
                      With Love & Anticipation,
                    </p>
                    <p style="margin: 0; color: #D4AF37; font-size: 18px; font-weight: 600;">
                      Brenda & Diamond
                    </p>
                  </div>

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f9f9f9; padding: 24px 32px; text-align: center; border-top: 1px solid #e5e5e5;">
                  <p style="margin: 0 0 8px 0; color: #999; font-size: 12px;">
                    This is an urgent reminder for your wedding invitation
                  </p>
                  <p style="margin: 0; color: #999; font-size: 12px;">
                    Please respond at your earliest convenience
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `
}

function generateEmailText(payload: EmailPayload): string {
  const { guestName, events, rsvpUrl } = payload
  
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime()
  )

  const eventsText = sortedEvents.map(event => {
    const eventDate = new Date(event.startsAtISO).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
    return `
${event.name}
When: ${eventDate}
Where: ${event.venue}${event.address ? `\nAddress: ${event.address}` : ''}
    `.trim()
  }).join('\n\n---\n\n')

  return `
⚠️ URGENT - ACTION REQUIRED ⚠️

⏰ TIME IS RUNNING OUT! PLEASE CONFIRM YOUR RSVP

Dear ${guestName},

WE HAVEN'T HEARD FROM YOU YET!

Our wedding is fast approaching, and we need to finalize important arrangements including seating, catering, and more. YOUR RESPONSE IS URGENTLY NEEDED!

We would be honored to celebrate our special day with you. Please take a moment right now to let us know if you can join us:

EVENT DETAILS:
${eventsText}

⏱️ PLEASE RESPOND WITHIN 48 HOURS
We need to confirm final numbers with our vendors immediately.

RSVP NOW: ${rsvpUrl}

If you're unable to attend, please let us know as soon as possible. We completely understand and appreciate your response either way.

With Love & Anticipation,
Brenda & Diamond

---
This is an urgent reminder for your wedding invitation.
Please respond at your earliest convenience.
  `.trim()
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    const payload: EmailPayload = await req.json()

    console.log('Sending urgent RSVP reminder to:', payload.to)

    // Generate email content
    const htmlContent = generateEmailHTML(payload)
    const textContent = generateEmailText(payload)

    // Send email via Resend with high priority
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'RSVP Reminder <rsvp@brendabagsherdiamond.com>',
        to: [payload.to],
        subject: '⏰ URGENT: Please Confirm Your RSVP - Brenda & Diamond Wedding',
        html: htmlContent,
        text: textContent,
        headers: {
          'X-Priority': '1',
          'X-MSMail-Priority': 'High',
          'Importance': 'high',
        },
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Resend API error: ${errorText}`)
    }

    const emailResult = await emailResponse.json()
    console.log('Resend response:', emailResult)

    // Log the reminder email
    const { error: logError } = await supabase
      .from('mail_logs')
      .insert({
        token: payload.token,
        email: payload.to,
        status: 'sent',
        provider: 'resend',
        message_id: emailResult.id,
        metadata: {
          type: 'rsvp_reminder',
          invitation_id: payload.invitationId,
          events: payload.events.map(e => e.id),
          priority: 'high',
        },
      })

    if (logError) {
      console.error('Error logging email:', logError)
    }

    // Log audit trail
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'email.rsvp_reminder.sent',
        resource_type: 'invitation',
        resource_id: payload.invitationId,
        metadata: {
          email: payload.to,
          guest_name: payload.guestName,
          events: payload.events.map(e => ({ id: e.id, name: e.name })),
          message_id: emailResult.id,
          priority: 'high',
        },
      })

    if (auditError) {
      console.error('Error logging audit:', auditError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Urgent RSVP reminder sent successfully',
        messageId: emailResult.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error sending urgent RSVP reminder:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

