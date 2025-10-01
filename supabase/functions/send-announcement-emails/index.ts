import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnnouncementEmailData {
  announcement_id: string
  batch_id: string
  recipients: Array<{
    id: string
    email: string
    guest_name: string
  }>
  announcement: {
    title: string
    subject: string
    content: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { announcement_id, batch_id, recipients, announcement }: AnnouncementEmailData = await req.json()

    if (!announcement_id || !batch_id || !recipients || !announcement) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Process each recipient
    for (const recipient of recipients) {
      try {
        // Create email content
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
            border-bottom: 2px solid #f0f0f0;
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
        <div class="header">
            <h1 class="title">${announcement.title}</h1>
        </div>
        
        <div class="content">
            <p class="greeting">Dear ${recipient.guest_name || 'Guest'},</p>
            ${announcement.content}
        </div>
        
        <div class="footer">
            <p>This message was sent to you as part of our wedding celebration.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
    </div>
</body>
</html>`

        // Send email using Supabase Edge Function (you'll need to set up email service)
        // For now, we'll simulate the email sending
        const emailResult = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Wedding Announcements <noreply@yourdomain.com>',
            to: [recipient.email],
            subject: announcement.subject,
            html: emailHtml,
          }),
        })

        if (emailResult.ok) {
          // Update recipient status to sent
          await supabase
            .from('announcement_recipients')
            .update({
              status: 'sent',
              sent_at: new Date().toISOString()
            })
            .eq('id', recipient.id)

          results.sent++
        } else {
          const errorText = await emailResult.text()
          throw new Error(`Email API error: ${errorText}`)
        }

      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error)
        
        // Update recipient status to failed
        await supabase
          .from('announcement_recipients')
          .update({
            status: 'failed',
            error_message: error.message
          })
          .eq('id', recipient.id)

        results.failed++
        results.errors.push(`${recipient.email}: ${error.message}`)
      }
    }

    // Update batch status
    const batchStatus = results.failed === recipients.length ? 'failed' : 'completed'
    await supabase
      .from('announcement_batches')
      .update({
        status: batchStatus,
        sent_count: results.sent,
        failed_count: results.failed,
        completed_at: new Date().toISOString()
      })
      .eq('id', batch_id)

    // Update announcement statistics
    await supabase
      .from('announcements')
      .update({
        sent_count: supabase.rpc('increment', { 
          column: 'sent_count', 
          amount: results.sent 
        }),
        failed_count: supabase.rpc('increment', { 
          column: 'failed_count', 
          amount: results.failed 
        })
      })
      .eq('id', announcement_id)

    // Check if all recipients have been processed
    const { data: remainingRecipients } = await supabase
      .from('announcement_recipients')
      .select('id')
      .eq('announcement_id', announcement_id)
      .eq('status', 'pending')

    if (!remainingRecipients || remainingRecipients.length === 0) {
      // All recipients processed, update announcement status
      await supabase
        .from('announcements')
        .update({ status: 'sent' })
        .eq('id', announcement_id)
    } else {
      // Still have pending recipients, keep as sending
      await supabase
        .from('announcements')
        .update({ status: 'sending' })
        .eq('id', announcement_id)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${recipients.length} recipients`,
        results
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in send-announcement-emails function:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
