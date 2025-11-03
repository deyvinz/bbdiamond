import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, subject, message } = body

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Get support email from environment or use default
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL || 'hello@luwani.com'
    const resendApiKey = process.env.RESEND_API_KEY

    if (!resendApiKey) {
      console.error('RESEND_API_KEY is not configured')
      // For development, we can still return success but log the issue
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json(
          { success: false, error: 'Email service not configured' },
          { status: 500 }
        )
      }
    }

    // Prepare email content
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Contact Form Submission</title>
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
        .field {
            margin-bottom: 20px;
        }
        .field-label {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 5px;
            display: block;
        }
        .field-value {
            color: #555;
            padding: 10px;
            background-color: #f8f9fa;
            border-radius: 5px;
        }
        .message {
            white-space: pre-wrap;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">New Contact Form Submission</h1>
        </div>
        
        <div class="field">
            <span class="field-label">Name:</span>
            <div class="field-value">${escapeHtml(name)}</div>
        </div>
        
        <div class="field">
            <span class="field-label">Email:</span>
            <div class="field-value">${escapeHtml(email)}</div>
        </div>
        
        ${phone ? `
        <div class="field">
            <span class="field-label">Phone:</span>
            <div class="field-value">${escapeHtml(phone)}</div>
        </div>
        ` : ''}
        
        <div class="field">
            <span class="field-label">Subject:</span>
            <div class="field-value">${escapeHtml(subject)}</div>
        </div>
        
        <div class="field">
            <span class="field-label">Message:</span>
            <div class="field-value message">${escapeHtml(message)}</div>
        </div>
        
        <div class="footer">
            <p>This message was sent from the Luwāni contact form.</p>
            <p>Reply directly to: <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
        </div>
    </div>
</body>
</html>`

    const emailText = `
New Contact Form Submission

Name: ${name}
Email: ${email}
${phone ? `Phone: ${phone}\n` : ''}Subject: ${subject}

Message:
${message}

---
Reply to: ${email}
`

    // Send email via Resend API
    if (resendApiKey) {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Luwāni Contact Form <noreply@luwani.com>',
          to: [supportEmail],
          reply_to: email,
          subject: `Contact Form: ${subject}`,
          html: emailHtml,
          text: emailText,
        }),
      })

      if (!emailResponse.ok) {
        const errorText = await emailResponse.text()
        console.error('Resend API error:', errorText)
        throw new Error('Failed to send email')
      }
    } else {
      // In development without Resend, just log the submission
      console.log('Contact form submission (email not sent - RESEND_API_KEY not configured):')
      console.log({ name, email, phone, subject, message })
    }

    // Optionally, you could also store the submission in a database table here
    // For now, we'll just send the email

    return NextResponse.json({
      success: true,
      message: 'Your message has been sent successfully. We\'ll get back to you soon!'
    })

  } catch (error) {
    console.error('Contact form error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send message. Please try again.'
      },
      { status: 500 }
    )
  }
}

// Helper function to escape HTML
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}

