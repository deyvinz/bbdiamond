// supabase functions deploy send-qr-email
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import QRCode from 'npm:qrcode@1.5.3';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface QREmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  meta: {
    invitationId: string;
    weddingId?: string;
    eventIds?: string[];
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
    primaryEvent?: {
      id: string;
      name: string;
      startsAtISO: string;
      venue: string;
      address?: string;
    };
    includeQr?: boolean;
    eventDate?: string;
    qrImageUrl?: string;
    coupleDisplayName?: string;
    contactEmail?: string;
    websiteUrl?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

// Helper function to fetch email config and branding
async function getEmailConfigData(weddingId?: string) {
  if (!weddingId) {
    return null;
  }

  try {
    const { data: emailConfig } = await supabase
      .from('wedding_email_config')
      .select('*')
      .eq('wedding_id', weddingId)
      .single();

    const { data: wedding } = await supabase
      .from('weddings')
      .select('couple_display_name, contact_email, custom_domain, subdomain')
      .eq('id', weddingId)
      .single();

    const { data: theme } = await supabase
      .from('wedding_themes')
      .select('logo_url, email_logo_url, primary_color')
      .eq('wedding_id', weddingId)
      .single();

    if (!wedding) {
      return null;
    }

    const logoUrl = emailConfig?.logo_url || theme?.email_logo_url || theme?.logo_url || null;
    const primaryColor = emailConfig?.primary_color || theme?.primary_color || '#C7A049';
    const coupleDisplayName = wedding.couple_display_name || 'Wedding Celebration';
    
    let websiteUrl = 'https://luwani.com';
    if (wedding.custom_domain) {
      websiteUrl = `https://${wedding.custom_domain}`;
    } else if (wedding.subdomain) {
      const baseDomain = Deno.env.get('NEXT_PUBLIC_APP_URL') 
        ? new URL(Deno.env.get('NEXT_PUBLIC_APP_URL')!).hostname.replace('www.', '')
        : 'luwani.com';
      websiteUrl = `https://${wedding.subdomain}.${baseDomain}`;
    }

    const contactEmail = emailConfig?.reply_to_email || wedding.contact_email || 'contact@luwani.com';

    return {
      logoUrl,
      primaryColor,
      coupleDisplayName,
      websiteUrl,
      contactEmail,
      fromName: emailConfig?.from_name || coupleDisplayName,
      fromEmail: emailConfig?.from_email || contactEmail,
      replyToEmail: emailConfig?.reply_to_email || contactEmail,
    };
  } catch (error) {
    console.error('Error fetching email config:', error);
    return null;
  }
}

// Helper function to generate QR code
async function generateQRCode(token: string, baseUrl: string): Promise<string> {
  try {
    const checkinUrl = `${baseUrl}/admin/checkin?token=${token}`;
    const dataUrl = await QRCode.toDataURL(checkinUrl, {
      width: 150,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111111',
        light: '#FFFFFF',
      },
    });
    // Extract base64 data
    return dataUrl.split(',')[1];
  } catch (error) {
    console.error('QR code generation error:', error);
    throw new Error('Failed to generate QR code');
  }
}

// Helper function to generate digital pass HTML
function generateDigitalPassHTML(
  guestName: string,
  inviteCode: string,
  events: Array<{
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>,
  qrDataUrl: string,
  branding?: {
    primaryColor: string;
    coupleDisplayName: string;
  }
): string {
  const primaryColor = branding?.primaryColor || '#C7A049';
  const coupleDisplayName = branding?.coupleDisplayName || 'Wedding Celebration';

  const formatEventDateTime = (startsAtISO: string) => {
    const [datePart, timePart] = startsAtISO.split(' ');
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
      hour = hour % 12 || 12;
      eventTime = `${hour}:${minute} ${ampm}`;
    }
    return `${eventDate} · ${eventTime}`;
  };

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wedding Access Pass - ${guestName}</title>
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
            background: linear-gradient(90deg, ${primaryColor} 0%, #D4AF37 50%, ${primaryColor} 100%);
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
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="pass-container">
        <div class="header">
            <div class="wedding-title">${coupleDisplayName}</div>
        </div>
        
        <div class="guest-info">
            <div class="guest-name">${guestName}</div>
            <div class="invite-code">
                <div class="invite-code-label">Invite Code</div>
                <div class="invite-code-value">${inviteCode}</div>
            </div>
        </div>
        
        <div class="qr-section">
            <div class="qr-code">
                <img src="data:image/png;base64,${qrDataUrl}" alt="QR Code" style="width: 100%; height: 100%; object-fit: contain;">
            </div>
            <div class="qr-label">Present this QR code at check-in</div>
        </div>
        
        <div class="events-section">
            <div class="events-title">Your Events</div>
            ${events
              .map(
                (event) => `
            <div class="event-card">
                <div class="event-name">${event.name}</div>
                <div class="event-details">
                    <div class="event-detail-row">
                        <span class="event-detail-label">Date & Time:</span> ${formatEventDateTime(event.startsAtISO)}
                    </div>
                    <div class="event-detail-row">
                        <span class="event-detail-label">Venue:</span> ${event.venue}
                    </div>
                    ${event.address ? `<div class="event-detail-row"><span class="event-detail-label">Address:</span> ${event.address}</div>` : ''}
                </div>
            </div>
            `
              )
              .join('')}
        </div>
        
        <div class="footer">
            <p>Please save this pass to your phone or print it out for easy access.</p>
        </div>
    </div>
</body>
</html>
  `.trim();
}

// Helper function to generate invitation email HTML
async function generateInvitationEmailHTML({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  primaryEvent,
  eventDate,
  qrDataUrl,
  branding,
}: {
  guestName: string;
  inviteCode: string;
  rsvpUrl: string;
  events: Array<{
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
  primaryEvent?: {
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  };
  eventDate?: string;
  qrDataUrl?: string;
  branding?: {
    logoUrl?: string | null;
    primaryColor: string;
    coupleDisplayName: string;
    websiteUrl: string;
    contactEmail: string;
  };
}): Promise<string> {
  const formatEventDateTime = (startsAtISO: string) => {
    const [datePart, timePart] = startsAtISO.split(' ');
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
      hour = hour % 12 || 12;
      eventTime = `${hour}:${minute} ${ampm}`;
    }
    return `${eventDate} · ${eventTime}`;
  };

  const primaryColor = branding?.primaryColor || '#C7A049';
  const coupleDisplayName = branding?.coupleDisplayName || 'Wedding Celebration';
  const logoUrl = branding?.logoUrl;
  const websiteUrl = branding?.websiteUrl || rsvpUrl.split('/rsvp')[0] || 'https://luwani.com';
  const contactEmail = branding?.contactEmail || 'contact@luwani.com';

  const mainEvent = primaryEvent || events[0];

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited — ${coupleDisplayName}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    
    <!-- Header -->
    <div style="background-color: #FFFFFF; padding: 40px 20px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${coupleDisplayName}" style="max-width: 200px; height: auto; margin: 0 auto 16px auto; display: block;">` : `<h1 style="color: #111111; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">${coupleDisplayName}</h1>`}
      <p style="color: ${primaryColor}; font-size: 18px; margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">Wedding Celebration</p>
      <hr style="border: 2px solid ${primaryColor}; margin: 0; width: 60px;">
    </div>

    <!-- Main Content -->
    <div style="background-color: #FFFFFF; padding: 40px 20px;">
      <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Dear ${guestName},</p>
      
      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        We are absolutely thrilled to invite you to celebrate our special day with us! Your presence would mean the world to us, and we can't wait to share this joyous occasion with you.
      </p>

      ${mainEvent ? `
      <!-- Main Event -->
      <div style="background-color: #FFFFFF; border: 2px solid ${primaryColor}; border-radius: 8px; padding: 24px; margin: 24px 0;">
        <h2 style="color: #111111; font-size: 20px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">${mainEvent.name}</h2>
        
        <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
          <span style="font-weight: 600; color: #111111; margin-right: 8px;">📅 Date & Time:</span>${eventDate || formatEventDateTime(mainEvent.startsAtISO)}
        </p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
          <span style="font-weight: 600; color: #111111; margin-right: 8px;">📍 Venue:</span>${mainEvent.venue}
        </p>
        ${mainEvent.address ? `
        <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
          <span style="font-weight: 600; color: #111111; margin-right: 8px;">🏠 Address:</span>${mainEvent.address}
        </p>
        ` : ''}
      </div>
      ` : ''}

      ${events.length > 1 ? `
      <!-- Additional Events -->
      <div style="margin: 32px 0;">
        <h2 style="color: #111111; font-size: 20px; font-weight: bold; margin: 0 0 24px 0; text-align: center; padding-bottom: 12px; border-bottom: 2px solid ${primaryColor};">
          Additional Events
        </h2>
        
        ${events
          .slice(1)
          .map((event) => {
            const eventMapUrl = event.address
              ? `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}`
              : undefined;

            return `
          <div style="background-color: #FFFFFF; border: 2px solid ${primaryColor}; border-radius: 8px; padding: 24px; margin: 16px 0;">
            <h3 style="color: #111111; font-size: 18px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">${event.name}</h3>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">📅 Date & Time:</span>${formatEventDateTime(event.startsAtISO)}
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">📍 Venue:</span>
              ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: ${primaryColor}; text-decoration: underline;">${event.venue}</a>` : event.venue}
            </p>
            ${
              event.address
                ? `
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">🏠 Address:</span>
              ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: ${primaryColor}; text-decoration: underline;">${event.address}</a>` : event.address}
            </p>
            `
                : ''
            }
          </div>
          `;
          })
          .join('')}
      </div>
      ` : ''}

      ${qrDataUrl ? `
      <!-- QR Code -->
      <div style="text-align: center; margin: 32px 0; background-color: #f8f9fa; border: 1px solid #EFE7D7; border-radius: 8px; padding: 24px;">
        <p style="color: #111111; font-size: 16px; font-weight: bold; margin: 0 0 16px 0;">Your QR Code</p>
        <img src="data:image/png;base64,${qrDataUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 2px solid ${primaryColor}; border-radius: 8px; padding: 8px; background: white;">
        <p style="color: #666666; font-size: 14px; margin: 16px 0 0 0;">
          Save this QR code for easy check-in at the event.
        </p>
      </div>
      ` : ''}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${rsvpUrl}" style="background-color: ${primaryColor}; border-radius: 8px; color: #111111; font-size: 18px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 16px 32px; border: none; cursor: pointer;">
          RSVP Now
        </a>
      </div>

      <!-- Invite Code -->
      <div style="background-color: #FFFFFF; border: 1px solid #EFE7D7; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Invite Code:</p>
        <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${inviteCode}</p>
      </div>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        We can't wait to celebrate with you! If you have any questions, please don't hesitate to reach out.
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        With love and excitement,<br>
        ${coupleDisplayName}
      </p>
    </div>

    <!-- Footer -->
    <hr style="border-color: #EFE7D7; margin: 32px 0;">
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
        We can't wait to celebrate with you ✨
      </p>
      <p style="margin: 0 0 16px 0;">
        <a href="${websiteUrl}" style="color: ${primaryColor}; text-decoration: underline;">Visit our website</a>
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 0;">
        Questions? Contact us at <a href="mailto:${contactEmail}" style="color: ${primaryColor}; text-decoration: underline;">${contactEmail}</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// Helper function to generate email text
function generateInvitationEmailText({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  primaryEvent,
  eventDate,
  branding,
}: {
  guestName: string;
  inviteCode: string;
  rsvpUrl: string;
  events: Array<{
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
  primaryEvent?: {
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  };
  eventDate?: string;
  branding?: {
    coupleDisplayName: string;
    websiteUrl: string;
    contactEmail: string;
  };
}): string {
  const formatEventDateTime = (startsAtISO: string) => {
    const [datePart, timePart] = startsAtISO.split(' ');
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
      hour = hour % 12 || 12;
      eventTime = `${hour}:${minute} ${ampm}`;
    }
    return `${eventDate} · ${eventTime}`;
  };

  const coupleDisplayName = branding?.coupleDisplayName || 'Wedding Celebration';
  const websiteUrl = branding?.websiteUrl || rsvpUrl.split('/rsvp')[0] || 'https://luwani.com';
  const contactEmail = branding?.contactEmail || 'contact@luwani.com';
  
  const mainEvent = primaryEvent || events[0];
  
  const lines = [
    `${coupleDisplayName} — You're Invited!`,
    '',
    `Dear ${guestName},`,
    '',
    "We are absolutely thrilled to invite you to celebrate our special day with us! Your presence would mean the world to us, and we can't wait to share this joyous occasion with you.",
    '',
  ];

  if (mainEvent) {
    lines.push(
      mainEvent.name,
      eventDate || formatEventDateTime(mainEvent.startsAtISO),
      mainEvent.venue,
      mainEvent.address || '',
      ''
    );
  }

  if (events.length > 1) {
    lines.push('Additional Events:', '');
    events.slice(1).forEach((event) => {
      lines.push(
        event.name,
        formatEventDateTime(event.startsAtISO),
        event.venue,
        event.address || '',
        ''
      );
    });
  }

  lines.push(
    `RSVP Now: ${rsvpUrl}`,
    `Invite Code: ${inviteCode}`,
    '',
    "We can't wait to celebrate with you!",
    '',
    'With love and excitement,',
    coupleDisplayName,
    '',
    `Visit our website: ${websiteUrl}`,
    `Questions? Contact us at ${contactEmail}`
  );

  return lines.filter((line) => line.trim()).join('\n');
}

serve(async (req: Request) => {
  try {
    console.log('Edge function called with method:', req.method);
    const payload: QREmailPayload = await req.json();
    console.log('Payload received:', {
      to: payload.to,
      subject: payload.subject,
      hasMeta: !!payload.meta,
    });

    // Validate payload
    if (!payload.to || !payload.subject || !payload.meta) {
      console.error('Invalid payload:', {
        to: payload.to,
        subject: payload.subject,
        hasMeta: !!payload.meta,
      });
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { meta, attachments = [] } = payload;

    // Fetch email config and branding
    const branding = await getEmailConfigData(meta.weddingId);
    
    // Use branding from config or fallback to meta values
    const finalBranding = branding || {
      logoUrl: null,
      primaryColor: '#C7A049',
      coupleDisplayName: meta.coupleDisplayName || 'Wedding Celebration',
      websiteUrl: meta.websiteUrl || 'https://luwani.com',
      contactEmail: meta.contactEmail || 'contact@luwani.com',
    };

    // Build from address
    const fromAddress = branding 
      ? `"${branding.fromName}" <${branding.fromEmail}>`
      : `"${finalBranding.coupleDisplayName}" <noreply@luwani.com>`;

    // Use subject template if available
    let subject = payload.subject;
    if (meta.weddingId) {
      const { data: emailConfig } = await supabase
        .from('wedding_email_config')
        .select('invitation_subject_template')
        .eq('wedding_id', meta.weddingId)
        .single();
      
      if (emailConfig?.invitation_subject_template) {
        const template = emailConfig.invitation_subject_template;
        subject = template
          .replace('{guest_name}', meta.guestName)
          .replace('{event_name}', meta.primaryEvent?.name || meta.events[0]?.name || 'Event');
      }
    }

    // Generate QR code if needed
    let qrDataUrl: string | undefined;
    if (meta.includeQr !== false) {
      try {
        // Get token from invitation
        const { data: invitation } = await supabase
          .from('invitations')
          .select('token')
          .eq('id', meta.invitationId)
          .single();

        if (invitation?.token) {
          const baseUrl = finalBranding.websiteUrl;
          qrDataUrl = await generateQRCode(invitation.token, baseUrl);
          
          // Add QR code as attachment
          attachments.push({
            filename: 'qr-code.png',
            content: qrDataUrl,
            contentType: 'image/png',
          });
        }
      } catch (error) {
        console.warn('Failed to generate QR code:', error);
        // Continue without QR code
      }
    }

    // Generate digital pass HTML if QR code was generated
    let passAttachment: { filename: string; content: string; contentType: string } | undefined;
    if (qrDataUrl && meta.events.length > 0) {
      try {
        const { data: invitation } = await supabase
          .from('invitations')
          .select('token')
          .eq('id', meta.invitationId)
          .single();

        if (invitation?.token) {
          const passHTML = generateDigitalPassHTML(
            meta.guestName,
            meta.inviteCode,
            meta.events,
            qrDataUrl,
            finalBranding
          );
          const passBase64 = btoa(unescape(encodeURIComponent(passHTML)));
          passAttachment = {
            filename: 'wedding-pass.html',
            content: passBase64,
            contentType: 'text/html',
          };
          attachments.push(passAttachment);
        }
      } catch (error) {
        console.warn('Failed to generate digital pass:', error);
        // Continue without digital pass
      }
    }

    // Generate email HTML and text
    const html = await generateInvitationEmailHTML({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
      primaryEvent: meta.primaryEvent,
      eventDate: meta.eventDate,
      qrDataUrl: qrDataUrl,
      branding: finalBranding,
    });

    const text = generateInvitationEmailText({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
      primaryEvent: meta.primaryEvent,
      eventDate: meta.eventDate,
      branding: finalBranding,
    });

    // Send email with high priority headers
    console.log('Sending email to:', payload.to, 'with subject:', subject, 'from:', fromAddress);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: payload.to,
      replyTo: branding?.replyToEmail || finalBranding.contactEmail,
      subject: subject,
      html,
      text,
      attachments: attachments.map((att) => ({
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

    console.log('Email sent successfully:', data);

    // Log successful email send
    try {
      const { error: logError } = await supabase.from('mail_logs').insert({
        invitation_id: meta.invitationId,
        sent_at: new Date().toISOString(),
        meta: {
          to: payload.to,
          subject: payload.subject,
          type: 'invitation',
        },
      });

      if (logError) {
        console.warn('Failed to log email send:', logError);
      }
    } catch (error) {
      console.warn('Mail logging not available:', error);
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

