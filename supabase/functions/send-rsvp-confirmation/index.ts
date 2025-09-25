// supabase functions new send-rsvp-confirmation
// supabase functions deploy send-rsvp-confirmation
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { Resend } from "npm:resend@3.2.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const resend = new Resend(Deno.env.get("RESEND_API_KEY")!);
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface RsvpConfirmationPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
  meta: {
    invitationId: string;
    rsvpUrl: string;
    guestName: string;
    inviteCode: string;
    events: Array<{
      name: string;
      startsAtISO: string;
      venue: string;
      address?: string;
    }>;
    isAccepted: boolean;
    goodwillMessage?: string;
  };
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

// Helper function to generate email HTML
async function generateRsvpConfirmationHTML({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  isAccepted,
  goodwillMessage,
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
  isAccepted: boolean;
  goodwillMessage?: string;
}): Promise<string> {
  const formatEventDateTime = (startsAtISO: string) => {
    const eventDate = new Date(startsAtISO).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = new Date(startsAtISO).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${eventDate} · ${eventTime}`;
  };

  if (isAccepted) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>RSVP Confirmed — You're on the list!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    
    <!-- Header -->
    <div style="background-color: #FFFFFF; padding: 40px 20px; text-align: center;">
      <img src="https://brendabagsherdiamond.com/images/logo.png" alt="Brenda & Diamond Wedding" style="max-width: 200px; height: auto; margin: 0 auto 16px auto; display: block;">
      <p style="color: #C7A049; font-size: 18px; margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">Wedding Celebration</p>
      <hr style="border: 2px solid #C7A049; margin: 0; width: 60px;">
    </div>

    <!-- Main Content -->
    <div style="background-color: #FFFFFF; padding: 40px 20px;">
      <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Dear ${guestName},</p>
      
      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        <strong>You're confirmed! ✨</strong> We're so excited that you'll be joining us for our special day.
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        We've emailed your confirmation details, QR code, and digital access pass. 
        Please keep this information handy for the celebration.
      </p>

      <!-- Confirmed Events -->
      <div style="margin: 32px 0;">
        <h2 style="color: #111111; font-size: 20px; font-weight: bold; margin: 0 0 24px 0; text-align: center; padding-bottom: 12px; border-bottom: 2px solid #C7A049;">
          Your Confirmed Events
        </h2>
        
        ${events.map(event => {
          const eventMapUrl = event.address 
            ? `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}` 
            : undefined;
          
          return `
          <div style="background-color: #FFFFFF; border: 2px solid #C7A049; border-radius: 8px; padding: 24px; margin: 16px 0;">
            <h3 style="color: #111111; font-size: 18px; font-weight: bold; margin: 0 0 16px 0; text-align: center;">${event.name}</h3>
            
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">📅 Date & Time:</span>${formatEventDateTime(event.startsAtISO)}
            </p>
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">📍 Venue:</span>
              ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: #C7A049; text-decoration: underline;">${event.venue}</a>` : event.venue}
            </p>
            ${event.address ? `
            <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 8px 0;">
              <span style="font-weight: 600; color: #111111; margin-right: 8px;">🏠 Address:</span>
              ${eventMapUrl ? `<a href="${eventMapUrl}" style="color: #C7A049; text-decoration: underline;">${event.address}</a>` : event.address}
            </p>
            ` : ''}
          </div>
          `;
        }).join('')}
      </div>

      <!-- QR Code Note -->
      <div style="text-align: center; margin: 32px 0; background-color: #f8f9fa; border: 1px solid #EFE7D7; border-radius: 8px; padding: 24px;">
        <p style="color: #111111; font-size: 16px; font-weight: bold; margin: 0 0 16px 0;">Your QR Code & Digital Pass</p>
        <p style="color: #666666; font-size: 14px; margin: 0 0 16px 0;">
          Check the attached files for your QR code and digital access pass. 
          Save these to your phone or print them out for easy access to all events.
        </p>
        <a href="${rsvpUrl}" style="background-color: #C7A049; border-radius: 8px; color: #111111; font-size: 16px; font-weight: bold; text-decoration: none; text-align: center; display: inline-block; padding: 12px 24px; border: none; cursor: pointer;">
          View RSVP Details
        </a>
      </div>

      <!-- Invite Code -->
      <div style="background-color: #FFFFFF; border: 1px solid #EFE7D7; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Invite Code:</p>
        <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${inviteCode}</p>
      </div>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        We can't wait to celebrate with you! If you have any questions, 
        please don't hesitate to reach out.
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
        <a href="https://brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">Visit our website</a>
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 0;">
        Questions? Contact us at <a href="mailto:hello@brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">hello@brendabagsherdiamond.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  } else {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thank you for your response</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    
    <!-- Header -->
    <div style="background-color: #FFFFFF; padding: 40px 20px; text-align: center;">
      <img src="https://brendabagsherdiamond.com/images/logo.png" alt="Brenda & Diamond Wedding" style="max-width: 200px; height: auto; margin: 0 auto 16px auto; display: block;">
      <p style="color: #C7A049; font-size: 18px; margin: 0 0 20px 0; font-weight: 300; letter-spacing: 2px;">Wedding Celebration</p>
      <hr style="border: 2px solid #C7A049; margin: 0; width: 60px;">
    </div>

    <!-- Main Content -->
    <div style="background-color: #FFFFFF; padding: 40px 20px;">
      <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0 0 20px 0;">Dear ${guestName},</p>
      
      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0 0 20px 0;">
        Thank you for letting us know that you won't be able to join us. 
        We'll miss you, but we completely understand.
      </p>

      ${goodwillMessage ? `
      <div style="background-color: #f8f9fa; border: 1px solid #EFE7D7; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <p style="color: #111111; font-size: 14px; font-weight: bold; margin: 0 0 8px 0;">Your message to the couple:</p>
        <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 0; font-style: italic;">"${goodwillMessage}"</p>
      </div>
      ` : ''}

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        We hope to celebrate with you in other ways soon. 
        Thank you for being part of our lives and for your kind words.
      </p>

      <p style="color: #4a4a4a; font-size: 16px; line-height: 24px; margin: 20px 0;">
        With love and appreciation,<br>
        Brenda & Diamond
      </p>

      <!-- Invite Code -->
      <div style="background-color: #FFFFFF; border: 1px solid #EFE7D7; border-radius: 6px; padding: 20px; margin: 24px 0; text-align: center;">
        <p style="color: #666666; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">Your Invite Code:</p>
        <p style="color: #111111; font-size: 24px; font-weight: bold; margin: 0; font-family: monospace; letter-spacing: 2px;">${inviteCode}</p>
      </div>
    </div>

    <!-- Footer -->
    <hr style="border-color: #EFE7D7; margin: 32px 0;">
    <div style="text-align: center; padding: 20px 0;">
      <p style="color: #666666; font-size: 16px; line-height: 24px; margin: 0 0 16px 0;">
        Thank you for being part of our lives ✨
      </p>
      <p style="margin: 0 0 16px 0;">
        <a href="https://brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">Visit our website</a>
      </p>
      <p style="color: #666666; font-size: 14px; line-height: 20px; margin: 0;">
        Questions? Contact us at <a href="mailto:hello@brendabagsherdiamond.com" style="color: #C7A049; text-decoration: underline;">hello@brendabagsherdiamond.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}

// Helper function to generate email text
function generateRsvpConfirmationText({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  isAccepted,
  goodwillMessage,
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
  isAccepted: boolean;
  goodwillMessage?: string;
}): string {
  const formatEventDateTime = (startsAtISO: string) => {
    const eventDate = new Date(startsAtISO).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = new Date(startsAtISO).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    return `${eventDate} · ${eventTime}`;
  };

  const lines = [
    'Brenda & Diamond — RSVP Confirmation',
    '',
    `Dear ${guestName},`,
    '',
  ];

  if (isAccepted) {
    lines.push(
      'You\'re confirmed! ✨ We\'re so excited that you\'ll be joining us for our special day.',
      '',
      'Your Confirmed Events:',
      ...events.map(event => [
        event.name,
        formatEventDateTime(event.startsAtISO),
        event.venue,
        event.address || '',
        ''
      ]).flat(),
      `RSVP Details: ${rsvpUrl}`,
      `Invite Code: ${inviteCode}`,
      '',
      'We can\'t wait to celebrate with you!'
    );
  } else {
    lines.push(
      'Thank you for letting us know that you won\'t be able to join us.',
      'We\'ll miss you, but we completely understand.',
      ''
    );
    
    if (goodwillMessage) {
      lines.push(
        'Your message to the couple:',
        `"${goodwillMessage}"`,
        ''
      );
    }
    
    lines.push(
      'We hope to celebrate with you in other ways soon.',
      'Thank you for being part of our lives.',
      '',
      'With love and appreciation,',
      'Brenda & Diamond'
    );
  }

  lines.push(
    '',
    'Visit our website: https://brendabagsherdiamond.com',
    'Questions? Contact us at hello@brendabagsherdiamond.com'
  );
  
  return lines.filter(line => line.trim()).join('\n');
}

serve(async (req: Request) => {
  try {
    console.log('Edge function called with method:', req.method);
    const payload: RsvpConfirmationPayload = await req.json();
    console.log('Payload received:', { to: payload.to, subject: payload.subject, hasMeta: !!payload.meta });
    
    // Validate payload
    if (!payload.to || !payload.subject || !payload.meta) {
      console.error('Invalid payload:', { to: payload.to, subject: payload.subject, hasMeta: !!payload.meta });
      return new Response(JSON.stringify({ error: "Invalid payload" }), { 
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const { meta, attachments = [] } = payload;
    
    // Check rate limit (max 3 emails per day per invitation) - skip if table doesn't exist
    let rateLimitExceeded = false;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: recentEmails, error: rateLimitError } = await supabase
        .from('mail_logs')
        .select('id')
        .eq('invitation_id', meta.invitationId)
        .gte('sent_at', `${today}T00:00:00.000Z`)
        .lt('sent_at', `${today}T23:59:59.999Z`);

      if (rateLimitError) {
        console.warn('Rate limit check failed (table may not exist):', rateLimitError);
        // Continue without rate limiting if table doesn't exist
      } else if (recentEmails && recentEmails.length >= 3) {
        rateLimitExceeded = true;
      }
    } catch (error) {
      console.warn('Rate limiting not available:', error);
      // Continue without rate limiting if table doesn't exist
    }

    if (rateLimitExceeded) {
      return new Response(JSON.stringify({ 
        error: "Rate limit exceeded. Maximum 3 emails per day per invitation." 
      }), { 
        status: 429,
        headers: { "Content-Type": "application/json" }
      });
    }

    // Generate email HTML and text
    const html = await generateRsvpConfirmationHTML({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
      isAccepted: meta.isAccepted,
      goodwillMessage: meta.goodwillMessage,
    });

    const text = generateRsvpConfirmationText({
      guestName: meta.guestName,
      inviteCode: meta.inviteCode,
      rsvpUrl: meta.rsvpUrl,
      events: meta.events,
      isAccepted: meta.isAccepted,
      goodwillMessage: meta.goodwillMessage,
    });

    // Send email
    console.log('Sending email to:', payload.to, 'with subject:', payload.subject);
    const { data, error } = await resend.emails.send({
      from: "Brenda & Diamond <hello@brendabagsherdiamond.com>",
      to: payload.to,
      subject: payload.subject,
      html,
      text,
      attachments: attachments.map(att => ({
        filename: att.filename,
        content: att.content,
        content_type: att.contentType,
      })),
    });

    if (error) {
      console.error("Resend error:", error);
      return new Response(JSON.stringify({ error: "Failed to send email" }), { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }

    console.log('Email sent successfully:', data);

    // Log successful email send (if mail_logs table exists and has the right structure)
    try {
      const { error: logError } = await supabase
        .from('mail_logs')
        .insert({
          invitation_id: meta.invitationId,
          sent_at: new Date().toISOString(),
          meta: {
            to: payload.to,
            subject: payload.subject,
            events: meta.events,
            isAccepted: meta.isAccepted,
          }
        });

      if (logError) {
        console.warn('Failed to log email send (table may not exist or have wrong structure):', logError);
        // Don't fail the request for logging errors
      }
    } catch (error) {
      console.warn('Mail logging not available:', error);
      // Don't fail the request for logging errors
    }

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: data?.id 
    }), { 
      headers: { "Content-Type": "application/json" } 
    });
  } catch (e) {
    console.error("Edge function error:", e);
    return new Response(JSON.stringify({ error: String(e) }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
