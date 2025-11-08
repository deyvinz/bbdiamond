import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementEmailData {
  announcement_id: string;
  batch_id: string;
  wedding_id?: string;
  recipients: Array<{
    id: string;
    email: string;
    guest_name: string;
  }>;
  announcement: {
    title: string;
    subject: string;
    content: string;
  };
}

// Helper function to fetch email config and branding
async function getEmailConfigData(supabase: any, weddingId?: string) {
  if (!weddingId) {
    return null;
  }

  try {
    // Fetch email config
    const { data: emailConfig } = await supabase
      .from('wedding_email_config')
      .select('*')
      .eq('wedding_id', weddingId)
      .single();

    // Fetch wedding data
    const { data: wedding } = await supabase
      .from('weddings')
      .select('couple_display_name, contact_email, custom_domain, subdomain')
      .eq('id', weddingId)
      .single();

    // Fetch theme
    const { data: theme } = await supabase
      .from('wedding_themes')
      .select('logo_url, email_logo_url, primary_color')
      .eq('wedding_id', weddingId)
      .single();

    if (!wedding) {
      return null;
    }

    // Build branding
    const logoUrl = emailConfig?.logo_url || theme?.email_logo_url || theme?.logo_url || null;
    const primaryColor = emailConfig?.primary_color || theme?.primary_color || '#C7A049';
    const coupleDisplayName = wedding.couple_display_name || 'Wedding Celebration';
    
    // Build website URL
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { announcement_id, batch_id, wedding_id, recipients, announcement }: AnnouncementEmailData =
      await req.json();

    if (!announcement_id || !batch_id || !recipients || !announcement) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch wedding_id from announcement if not provided
    let finalWeddingId = wedding_id;
    if (!finalWeddingId) {
      const { data: announcementData } = await supabase
        .from('announcements')
        .select('wedding_id')
        .eq('id', announcement_id)
        .single();
      finalWeddingId = announcementData?.wedding_id;
    }

    // Fetch email config and branding
    const branding = await getEmailConfigData(supabase, finalWeddingId);
    const defaultBranding = {
      logoUrl: null,
      primaryColor: '#C7A049',
      coupleDisplayName: 'Wedding Celebration',
      websiteUrl: 'https://luwani.com',
      contactEmail: 'contact@luwani.com',
      fromName: 'Wedding',
      fromEmail: 'noreply@luwani.com',
      replyToEmail: 'contact@luwani.com',
    };
    const finalBranding = branding || defaultBranding;

    // Build from address
    const fromAddress = `"${finalBranding.fromName}" <${finalBranding.fromEmail}>`;

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each recipient
    for (const recipient of recipients) {
      try {
        // Create email content with dynamic branding
        const logoHtml = finalBranding.logoUrl 
          ? `<img src="${finalBranding.logoUrl}" alt="${finalBranding.coupleDisplayName}" style="max-width: 150px; height: auto; margin: 0 auto; display: block;">`
          : `<h1 style="color: #111111; font-size: 32px; font-weight: bold; margin: 0 0 8px 0;">${finalBranding.coupleDisplayName}</h1>`;
        
        const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${announcement.subject}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid ${finalBranding.primaryColor};
        }
        .title {
            color: #2c3e50;
            font-size: 24px;
            margin-bottom: 10px;
        }
        .content {
            font-size: 16px;
            line-height: 1.8;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
        .greeting {
            font-size: 18px;
            margin-bottom: 20px;
            color: #2c3e50;
        }
    </style>
</head>
<body>
    <div class="container">
         <!-- Logo Header -->
    <div style="padding: 30px 20px; text-align: center;">
      ${logoHtml}
      <p style="color: ${finalBranding.primaryColor}; font-size: 18px; margin: 16px 0 20px 0; font-weight: 300; letter-spacing: 2px;">Wedding Celebration</p>
      <hr style="border: 2px solid ${finalBranding.primaryColor}; margin: 0; width: 60px;">
    </div>  
        <div class="content">
            <p class="greeting">Dear ${recipient.guest_name || 'Guest'},</p>
            <div class="content">${announcement.content}</div>
        </div>
        
        <div class="content">
           <a href="${finalBranding.websiteUrl}/registry" style="color: ${finalBranding.primaryColor}; text-decoration: underline;">Visit our registry</a>
        </div>
        <div class="footer">
            <p>This message was sent to you as part of our wedding celebration.</p>
            <p>If you have any questions, please don't hesitate to contact us. <a href="mailto:${finalBranding.contactEmail}" style="color: ${finalBranding.primaryColor}; text-decoration: underline;">${finalBranding.contactEmail}</a></p>
        </div>
    </div>
</body>
</html>`;

        // Send email with high priority headers
        const emailResult = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: fromAddress,
            to: [recipient.email],
            replyTo: finalBranding.replyToEmail,
            subject: announcement.subject,
            html: emailHtml,
            headers: {
              'X-Priority': '1',
              'X-MSMail-Priority': 'High',
              'Importance': 'high',
            },
          }),
        });

        if (emailResult.ok) {
          // Update recipient status to sent
          await supabase
            .from('announcement_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString(),
            })
            .eq('id', recipient.id);

          results.sent++;
        } else {
          const errorText = await emailResult.text();
          throw new Error(`Email API error: ${errorText}`);
        }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error);

        // Update recipient status to failed
        await supabase
          .from('announcement_recipients')
          .update({
            status: 'failed',
            error_message: error.message,
          })
          .eq('id', recipient.id);

        results.failed++;
        results.errors.push(`${recipient.email}: ${error.message}`);
      }
    }

    // Update batch status
    const batchStatus = results.failed === recipients.length ? 'failed' : 'completed';
    await supabase
      .from('announcement_batches')
      .update({
        status: batchStatus,
        sent_count: results.sent,
        failed_count: results.failed,
        completed_at: new Date().toISOString(),
      })
      .eq('id', batch_id);

    // Update announcement statistics
    await supabase
      .from('announcements')
      .update({
        sent_count: supabase.rpc('increment', {
          column: 'sent_count',
          amount: results.sent,
        }),
        failed_count: supabase.rpc('increment', {
          column: 'failed_count',
          amount: results.failed,
        }),
      })
      .eq('id', announcement_id);

    // Check if all recipients have been processed
    const { data: remainingRecipients } = await supabase
      .from('announcement_recipients')
      .select('id')
      .eq('announcement_id', announcement_id)
      .eq('status', 'pending');

    if (!remainingRecipients || remainingRecipients.length === 0) {
      // All recipients processed, update announcement status
      await supabase.from('announcements').update({ status: 'sent' }).eq('id', announcement_id);
    } else {
      // Still have pending recipients, keep as sending
      await supabase.from('announcements').update({ status: 'sending' }).eq('id', announcement_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${recipients.length} recipients`,
        results,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in send-announcement-emails function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
