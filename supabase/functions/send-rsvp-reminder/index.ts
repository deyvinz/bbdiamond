// supabase functions deploy send-rsvp-reminder
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { Resend } from 'npm:resend@3.2.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RsvpReminderPayload {
  to: string;
  guestName: string;
  invitationId: string;
  token: string;
  events: Array<{
    id: string;
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
  rsvpUrl: string;
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

// Helper function to generate email HTML
async function generateRsvpReminderHTML({
  guestName,
  rsvpUrl,
  events,
  branding,
}: {
  guestName: string;
  rsvpUrl: string;
  events: Array<{
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
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

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Reminder — We'd Love to Hear From You</title>
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
        We hope this message finds you well! We wanted to send a friendly reminder that we'd love to hear from you regarding our upcoming celebration.
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Your response helps us plan for the perfect day, and we'd be honored to have you join us.
      </p>

      <!-- Events -->
      <div style="margin: 32px 0;">
        <h2 style="color: #111111; font-size: 20px; font-weight: bold; margin: 0 0 24px 0; text-align: center; padding-bottom: 12px; border-bottom: 2px solid ${primaryColor};">
          Upcoming Events
        </h2>
        
        ${events
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

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${rsvpUrl}" style="background-color: ${primaryColor}; border-radius: 8px; color: #111111; font-size: 18px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 16px 32px; border: none; cursor: pointer;">
          RSVP Now
        </a>
      </div>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        If you have any questions or need assistance, please don't hesitate to reach out. We're here to help!
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        We can't wait to celebrate with you!<br>
        With love,<br>
        ${coupleDisplayName}
      </p>
    </div>

    <!-- Footer -->
    <hr style="border-color: #EFE7D7; margin: 32px 0;">
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
        We'd love to hear from you ✨
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
function generateRsvpReminderText({
  guestName,
  rsvpUrl,
  events,
  branding,
}: {
  guestName: string;
  rsvpUrl: string;
  events: Array<{
    name: string;
    startsAtISO: string;
    venue: string;
    address?: string;
  }>;
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
  
  const lines = [
    `${coupleDisplayName} — RSVP Reminder`,
    '',
    `Dear ${guestName},`,
    '',
    "We hope this message finds you well! We wanted to send a friendly reminder that we'd love to hear from you regarding our upcoming celebration.",
    '',
    'Upcoming Events:',
    ...events
      .map((event) => [
        event.name,
        formatEventDateTime(event.startsAtISO),
        event.venue,
        event.address || '',
        '',
      ])
      .flat(),
    `RSVP Now: ${rsvpUrl}`,
    '',
    "We can't wait to celebrate with you!",
    '',
    'With love,',
    coupleDisplayName,
    '',
    `Visit our website: ${websiteUrl}`,
    `Questions? Contact us at ${contactEmail}`,
  ];

  return lines.filter((line) => line.trim()).join('\n');
}

serve(async (req: Request) => {
  try {
    console.log('Edge function called with method:', req.method);
    const payload: RsvpReminderPayload = await req.json();
    console.log('Payload received:', {
      to: payload.to,
      guestName: payload.guestName,
      invitationId: payload.invitationId,
    });

    // Validate payload
    if (!payload.to || !payload.guestName || !payload.invitationId || !payload.rsvpUrl) {
      console.error('Invalid payload:', payload);
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get wedding ID from invitation
    const { data: invitation } = await supabase
      .from('invitations')
      .select('wedding_id')
      .eq('id', payload.invitationId)
      .single();

    const weddingId = invitation?.wedding_id;

    // Fetch email config and branding
    const branding = await getEmailConfigData(weddingId);
    
    const finalBranding = branding || {
      logoUrl: null,
      primaryColor: '#C7A049',
      coupleDisplayName: 'Wedding Celebration',
      websiteUrl: payload.rsvpUrl.split('/rsvp')[0] || 'https://luwani.com',
      contactEmail: 'contact@luwani.com',
    };

    // Build from address
    const fromAddress = branding 
      ? `"${branding.fromName}" <${branding.fromEmail}>`
      : `"${finalBranding.coupleDisplayName}" <noreply@luwani.com>`;

    // Generate subject
    let subject = `RSVP Reminder — We'd Love to Hear From You, ${payload.guestName}`;
    if (weddingId) {
      const { data: emailConfig } = await supabase
        .from('wedding_email_config')
        .select('rsvp_reminder_subject_template')
        .eq('wedding_id', weddingId)
        .single();
      
      if (emailConfig?.rsvp_reminder_subject_template) {
        const template = emailConfig.rsvp_reminder_subject_template;
        subject = template
          .replace('{guest_name}', payload.guestName)
          .replace('{event_name}', payload.events[0]?.name || 'Event');
      }
    }

    // Generate email HTML and text
    const html = await generateRsvpReminderHTML({
      guestName: payload.guestName,
      rsvpUrl: payload.rsvpUrl,
      events: payload.events,
      branding: finalBranding,
    });

    const text = generateRsvpReminderText({
      guestName: payload.guestName,
      rsvpUrl: payload.rsvpUrl,
      events: payload.events,
      branding: finalBranding,
    });

    // Send email
    console.log('Sending email to:', payload.to, 'with subject:', subject);
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: payload.to,
      replyTo: branding?.replyToEmail || finalBranding.contactEmail,
      subject: subject,
      html,
      text,
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
        invitation_id: payload.invitationId,
        sent_at: new Date().toISOString(),
        meta: {
          to: payload.to,
          subject: subject,
          type: 'rsvp_reminder',
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

