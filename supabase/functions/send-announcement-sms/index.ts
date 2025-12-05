import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnnouncementSmsData {
  announcement_id: string;
  batch_id: string;
  wedding_id?: string;
  recipients: Array<{
    id: string;
    phone: string;
    guest_name: string;
  }>;
  announcement: {
    title: string;
    subject: string;
    content: string;
  };
}

// Helper function to strip HTML and format for SMS
function stripHtmlAndFormat(html: string): string {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  return text;
}

// Helper function to format phone number to E.164
function formatPhoneNumber(phone: string, countryCode: string = '+1'): string {
  const cleaned = phone.trim();
  
  // If already in E.164 format, return as-is
  if (/^\+[1-9]\d{1,14}$/.test(cleaned)) {
    return cleaned;
  }
  
  // Extract only digits
  const digits = cleaned.replace(/\D/g, '');
  
  // If the number starts with the country code digits (without +), add the +
  const countryDigits = countryCode.replace(/\D/g, '');
  if (digits.startsWith(countryDigits)) {
    return `+${digits}`;
  }
  
  // Otherwise, prepend the default country code
  return `${countryCode}${digits}`;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { announcement_id, batch_id, wedding_id, recipients, announcement }: AnnouncementSmsData =
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

    // Get wedding data for branding
    let coupleDisplayName = 'Wedding Celebration';
    let websiteUrl = 'https://luwani.com';
    
    if (finalWeddingId) {
      const { data: wedding } = await supabase
        .from('weddings')
        .select('couple_display_name, custom_domain, subdomain')
        .eq('id', finalWeddingId)
        .single();
      
      if (wedding) {
        coupleDisplayName = wedding.couple_display_name || coupleDisplayName;
        
        // Build website URL
        if (wedding.custom_domain) {
          websiteUrl = `https://${wedding.custom_domain}`;
        } else if (wedding.subdomain) {
          const baseDomain = Deno.env.get('NEXT_PUBLIC_APP_URL') 
            ? new URL(Deno.env.get('NEXT_PUBLIC_APP_URL')!).hostname.replace('www.', '')
            : 'luwani.com';
          websiteUrl = `https://${wedding.subdomain}.${baseDomain}`;
        }
      }
    }

    // Twilio configuration
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
    const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

    if (!accountSid || !authToken) {
      return new Response(
        JSON.stringify({ error: 'Twilio credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (!fromNumber && !messagingServiceSid) {
      return new Response(
        JSON.stringify({ error: 'Twilio phone number or messaging service not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Format announcement content for SMS (strip HTML, limit length)
    const contentText = stripHtmlAndFormat(announcement.content);
    // Limit to ~1500 characters (SMS supports up to 1600, but we'll be conservative)
    const maxLength = 1500;
    const truncatedContent = contentText.length > maxLength 
      ? contentText.substring(0, maxLength - 3) + '...'
      : contentText;

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each recipient
    for (const recipient of recipients) {
      try {
        // Format phone number
        const formattedPhone = formatPhoneNumber(recipient.phone);

        // Build SMS message
        const smsBody = `${announcement.subject || announcement.title}\n\nDear ${recipient.guest_name || 'Guest'},\n\n${truncatedContent}\n\n${websiteUrl}`;

        // Build request body for Twilio API
        const formData = new URLSearchParams();
        formData.append('To', formattedPhone);
        formData.append('Body', smsBody);

        // Use messaging service if available, otherwise use phone number
        if (messagingServiceSid) {
          formData.append('MessagingServiceSid', messagingServiceSid);
        } else if (fromNumber) {
          formData.append('From', fromNumber);
        }

        // Send SMS via Twilio API
        const response = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || `Twilio API error: ${response.status}`);
        }

        // Update recipient status to sent
        await supabase
          .from('announcement_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString(),
            channel: 'sms',
            message_id: data.sid,
          })
          .eq('id', recipient.id);

        results.sent++;
      } catch (error) {
        console.error(`Error sending SMS to ${recipient.phone}:`, error);

        // Update recipient status to failed
        await supabase
          .from('announcement_recipients')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            channel: 'sms',
          })
          .eq('id', recipient.id);

        results.failed++;
        results.errors.push(`${recipient.phone}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const { data: currentAnnouncement } = await supabase
      .from('announcements')
      .select('sent_count, failed_count')
      .eq('id', announcement_id)
      .single();

    await supabase
      .from('announcements')
      .update({
        sent_count: (currentAnnouncement?.sent_count || 0) + results.sent,
        failed_count: (currentAnnouncement?.failed_count || 0) + results.failed,
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
    console.error('Error in send-announcement-sms function:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

