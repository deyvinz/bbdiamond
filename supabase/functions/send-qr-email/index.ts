// supabase functions new send-qr-email
// supabase functions deploy send-qr-email
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';
import QRCode from 'npm:qrcode@1.5.3';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  meta: {
    invitationId: string;
    eventIds: string[];
    rsvpUrl: string;
    guestName: string;
    inviteCode: string;
    events: Array<{
      id: string;
      name: string;
      startsAtISO: string;
      venue: string;
      address?: string;
    }>;
    primaryEvent: {
      id: string;
      name: string;
      startsAtISO: string;
      venue: string;
      address?: string;
    };
    includeQr: boolean;
    eventDate: string;
    qrImageUrl?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

// Helper function to generate QR code as base64 data URI
async function generateQRCodeBuffer(text: string): Promise<Buffer> {
  try {
    console.log('Generating QR code for:', text);
    const qrCodeBuffer = await QRCode.toBuffer(text, {
      width: 150,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    });
    console.log('QR code generated successfully, size:', qrCodeBuffer.length);
    return qrCodeBuffer;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw error;
  }
}

// Helper function to generate email HTML
async function generateEmailHTML({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  primaryEvent,
  eventDate,
  qrImageUrl,
  includeQr,
}: {
  guestName: string;
  inviteCode: string;
  rsvpUrl: string;
  events: Array<{
    id: string;
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
  primaryEvent: {
    id: string;
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  };
  eventDate: string;
  includeQr?: boolean;
}): Promise<string> {
  const mapUrl = primaryEvent.address
    ? `https://maps.google.com/maps?q=${encodeURIComponent(primaryEvent.address)}`
    : undefined;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited, ${guestName} — ${primaryEvent.name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    
    <!-- Logo Header -->
    <div style="background-color: #000000; padding: 30px 20px; text-align: center;">
      <img src="https://utumylehywfktctigkie.supabase.co/storage/v1/object/public/bdiamond/logo.png" alt="Brenda & Diamond" style="max-width: 200px; height: auto; margin: 0 auto; display: block;">
    </div>

    <!-- Header -->
    <div style="background-color: #FFFFFF; padding: 40px 20px; text-align: center;">
      <h1 style="color: #111111; font-size: 32px; font-weight: bold; margin: 0 0 8px 0; letter-spacing: 1px;">Brenda & Diamond</h1>
      <p style="color: #C7A049; font-size: 18px; margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">Wedding Celebration</p>
      <hr style="border: 2px solid #C7A049; margin: 0; width: 60px;">
    </div>

    <!-- Main Content -->
    <div style="background-color: #FFFFFF; padding: 40px 20px;">
      <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Dear ${guestName},</p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
       The countdown is on until we say <strong>“I do,”</strong> and we are so excited to celebrate with you!
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        On this <a href="https://brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">site</a>, you will find all the details. </br>
        And of course, don't forget to RSVP—we can't wait to see you!
        </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        • We will also be sharing a separate email with details on Ofi & Caps, so be on the lookout for that.
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        • Hashtag: #BrendaBagsHerDiamond
      </p>
      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        • Website: <a href="https://brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">brendabagsherdiamond.com</a>
      </p>

            <!-- Event Details Cards -->
            ${events
              .sort((a, b) => new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime())
              .map((event) => {
                // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
                const [datePart, timePart] = event.startsAtISO.split(' ');
                const [year, month, day] = datePart.split('-');
                const eventDate = new Date(
                  parseInt(year),
                  parseInt(month) - 1,
                  parseInt(day)
                ).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
                let eventTime = '00:00 AM';
                if (timePart) {
                  const [hourStr, minuteStr] = timePart.split(':');
                  let hour = parseInt(hourStr, 10);
                  const minute = minuteStr ? minuteStr.padStart(2, '0') : '00';
                  const ampm = hour >= 12 ? 'PM' : 'AM';
                  hour = hour % 12 || 12; // Convert 0/12/24 to 12-hour format
                  eventTime = `${hour}:${minute} ${ampm}`;
                }
                const eventMapUrl = event.address
                  ? `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}`
                  : undefined;
                const formattedEventDateTime = `${eventDate} · ${eventTime}`;

                return `
        <div style="background-color: #FFFFFF; border: 2px solid #C7A049; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <h2 style="color: #111111; font-size: 20px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">${event.name}</h2>
          
          <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
            <span style="font-weight: 600; color: #111111; margin-right: 8px;">📅 Date:</span>${formattedEventDateTime}
          </p>
          <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
            <span style="font-weight: 600; color: #111111; margin-right: 8px;">📍 Venue:</span>
            ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: #C7A049; text-decoration: underline;">${event.venue}</a>` : event.venue}
          </p>
          ${
            event.address
              ? `
          <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
            <span style="font-weight: 600; color: #111111; margin-right: 8px;">🏠 Address:</span>
            ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: #C7A049; text-decoration: underline;">${event.address}</a>` : event.address}
          </p>
          `
              : ''
          }
        </div>
        `;
              })
              .join('')}

      <!-- RSVP Button -->
      <div style="text-align: center; margin: 32px 0;">
       <div style="text-align: center;">
        <a href="${rsvpUrl}" style="background-color: #C7A049; border-radius: 8px; color: #111111; font-size: 18px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px; border: none; cursor: pointer; line-height: 1.2;">
          RSVP Now
        </a>
         <span style="display: inline-block; margin-right: 16px;"> </span>
        <a href="https://brendabagsherdiamond.com/registry" style="background-color: #C7A049; border-radius: 8px; color: #111111; font-size: 18px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px; border: none; cursor: pointer; line-height: 1.2;">
          Registry
        </a>
        </div>
        <p style="color: #666666; font-size: 14px; margin: 16px 0 0 0; font-family: monospace; word-break: break-all;">
          Can't click the button? Copy this link: <a href="${rsvpUrl}" style="color: #C7A049; text-decoration: underline;">${rsvpUrl}</a>
        </p>
      </div>
      <p>Kindly note that this email is a perosnalized invitation, and not a confirmation of your RSVP. This invitation is for 1 person only.</p>
      <p>RSVP is required for all events. Deadline for RSVP is 13th October 2025.</p>
      <!-- Invite Code -->
      <div style="background-color: #FFFFFF; border: 1px solid #EFE7D7; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Invite Code:</p>
        <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${inviteCode}</p>
      </div>

            ${
              includeQr
                ? `
            <!-- QR Code -->
            <div style="text-align: center; margin: 24px 0;">
              <p style="color: #666666; font-size: 14px; margin: 0 0 12px 0; font-weight: 500;">Show this at check-in (see attached QR code image):</p>
            </div>
            `
                : ''
            }

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        Please RSVP by clicking the button above or visiting our website.
        We can't wait to celebrate with you!
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        With love and excitement,<br>
        Brenda & Diamond
      </p>
    </div>

    <!-- Footer -->
    <hr style="border-color: #EFE7D7; margin: 32px 0;">
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
        We can't wait to celebrate with you ✨
      </p>
      <p style="margin: 0 0 16px 0;">
        <a href="https://brendabagsherdiamond.com/registry" style="color: #C7A049; text-decoration: underline;">Visit our website</a>
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 0;">
        Questions? Contact us at <a href="mailto:bidiamond2025@gmail.com" style="color: #C7A049; text-decoration: underline;">bidiamond2025@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// Helper function to generate email text
function generateEmailText({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
}: {
  guestName: string;
  inviteCode: string;
  rsvpUrl: string;
  events: Array<{
    id: string;
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
}): string {
  const eventDetails = events
    .sort((a, b) => new Date(a.startsAtISO).getTime() - new Date(b.startsAtISO).getTime())
    .map((event) => {
      // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
      const [datePart, timePart] = event.startsAtISO.split(' ');
      const [year, month, day] = datePart.split('-');
      const eventDate = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day)
      ).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      let eventTime = '00:00 AM';
      if (timePart) {
        const [hourStr, minuteStr] = timePart.split(':');
        let hour = parseInt(hourStr, 10);
        const minute = minuteStr ? minuteStr.padStart(2, '0') : '00';
        const ampm = hour >= 12 ? 'PM' : 'AM';
        hour = hour % 12 || 12; // Convert 0/12/24 to 12-hour format
        eventTime = `${hour}:${minute} ${ampm}`;
      }
      const formattedEventDateTime = `${eventDate} · ${eventTime}`;

      return [event.name, formattedEventDateTime, event.venue, event.address || '', ''];
    })
    .flat();

  const lines = [
    'Brenda & Diamond — Invitation',
    '',
    `Dear ${guestName},`,
    '',
    ...eventDetails,
    `RSVP: ${rsvpUrl}`,
    `Invite Code: ${inviteCode}`,
    '',
    "We can't wait to celebrate with you.",
  ];

  return lines.filter((line) => line.trim()).join('\n');
}

serve(async (req: Request) => {
  try {
    const payload: EmailPayload = await req.json();

    // Validate payload
    if (!payload.to || !payload.subject || !payload.meta) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { meta, attachments = [] } = payload;

    // Generate QR code as attachment if requested
    let finalAttachments = [...attachments];
    if (meta.includeQr) {
      try {
        const qrCodeBuffer = await generateQRCodeBuffer(meta.rsvpUrl);
        finalAttachments.push({
          filename: 'qr-code.png',
          content: qrCodeBuffer.toString('base64'),
          contentType: 'image/png',
        });
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }

    // Generate email HTML directly
    const html = await generateEmailHTML({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
      primaryEvent: meta.primaryEvent,
      eventDate: meta.eventDate,
      includeQr: meta.includeQr,
    });

    const text = generateEmailText({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
    });

    // Send email with high priority headers
    const { data, error } = await resend.emails.send({
      from: 'Wedding Invitation <invitation@brendabagsherdiamond.com>',
      to: payload.to,
      subject: payload.subject,
      html,
      text,
      attachments: finalAttachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high',
      },
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(JSON.stringify({ error: 'Failed to send email' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: data?.id,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (e) {
    console.error('Edge function error:', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
