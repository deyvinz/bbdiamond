import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Simple email sending without Edge Functions
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await supabaseServer()

    // Get announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (announcementError || !announcement) {
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('announcement_recipients')
      .select(`
        id,
        email,
        guest:guests(first_name, last_name)
      `)
      .eq('announcement_id', id)
      .eq('status', 'pending')

    if (recipientsError || !recipients || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pending recipients found' },
        { status: 400 }
      )
    }

    // For now, we'll simulate email sending and update the database
    // In a real implementation, you would integrate with an email service like Resend, SendGrid, etc.
    
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    }

    // Simulate sending emails (replace with actual email service)
    for (const recipient of recipients) {
      try {
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 100))

        // In a real implementation, you would call your email service here:
        // const emailResult = await sendEmail({
        //   to: recipient.email,
        //   subject: announcement.subject,
        //   html: generateEmailHTML(announcement, recipient)
        // })

        // For now, we'll just mark as sent
        const { error: updateError } = await supabase
          .from('announcement_recipients')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', recipient.id)

        if (updateError) {
          throw new Error(`Database update failed: ${updateError.message}`)
        }

        results.sent++
        console.log(`Simulated email sent to: ${recipient.email}`)

      } catch (error) {
        console.error(`Error processing recipient ${recipient.email}:`, error)
        
        // Mark as failed
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

    // Update announcement status
    const newStatus = results.failed === recipients.length ? 'failed' : 'sent'
    await supabase
      .from('announcements')
      .update({
        status: newStatus,
        sent_count: results.sent,
        failed_count: results.failed
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      message: `Processed ${recipients.length} recipients`,
      results
    })

  } catch (error) {
    console.error('Error in simple email sending:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to generate email HTML (you can customize this)
function generateEmailHTML(announcement: any, recipient: any) {
  const guestName = recipient.guest ? 
    `${recipient.guest.first_name} ${recipient.guest.last_name}` : 
    'Guest'

  return `
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
            <p class="greeting">Dear ${guestName},</p>
            ${announcement.content}
        </div>
        
        <div class="footer">
            <p>This message was sent to you as part of our wedding celebration.</p>
            <p>If you have any questions, please don't hesitate to contact us.</p>
        </div>
    </div>
</body>
</html>`
}
