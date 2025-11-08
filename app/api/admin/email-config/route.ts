import { NextRequest, NextResponse } from 'next/server'
import { getWeddingId } from '@/lib/wedding-context-server'
import { getEmailConfig, invalidateEmailConfigCache } from '@/lib/email-service'
import { supabaseService } from '@/lib/supabase-service'

export async function GET(request: NextRequest) {
  try {
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
      return NextResponse.json(
        { error: 'Wedding ID not found. Please ensure you are accessing this from a valid wedding domain.' },
        { status: 400 }
      )
    }

    const emailConfigData = await getEmailConfig(weddingId)
    
    if (!emailConfigData) {
      return NextResponse.json(
        { error: 'Email configuration not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(emailConfigData)
  } catch (error) {
    console.error('Error fetching email config:', error)
    return NextResponse.json(
      { error: 'Failed to fetch email configuration' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const weddingId = await getWeddingId()
    
    if (!weddingId) {
      return NextResponse.json(
        { error: 'Wedding ID not found. Please ensure you are accessing this from a valid wedding domain.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.from_name || !body.from_email) {
      return NextResponse.json(
        { error: 'from_name and from_email are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.from_email)) {
      return NextResponse.json(
        { error: 'from_email must be a valid email address' },
        { status: 400 }
      )
    }

    if (body.reply_to_email && !emailRegex.test(body.reply_to_email)) {
      return NextResponse.json(
        { error: 'reply_to_email must be a valid email address' },
        { status: 400 }
      )
    }

    // Validate hex color if provided
    if (body.primary_color && !/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(body.primary_color)) {
      return NextResponse.json(
        { error: 'primary_color must be a valid hex color code' },
        { status: 400 }
      )
    }

    // Validate URL if provided
    if (body.logo_url && !body.logo_url.match(/^https?:\/\/.+/)) {
      return NextResponse.json(
        { error: 'logo_url must be a valid HTTP/HTTPS URL' },
        { status: 400 }
      )
    }

    const supabase = supabaseService()

    // Check if email config exists
    const { data: existingConfig } = await supabase
      .from('wedding_email_config')
      .select('id')
      .eq('wedding_id', weddingId)
      .single()

    let updatedConfig

    if (existingConfig) {
      // Update existing config
      const { data, error } = await supabase
        .from('wedding_email_config')
        .update({
          from_name: body.from_name,
          from_email: body.from_email,
          reply_to_email: body.reply_to_email || null,
          invitation_subject_template: body.invitation_subject_template || "You're Invited, {guest_name} — {event_name}",
          rsvp_confirmation_subject_template: body.rsvp_confirmation_subject_template || 'RSVP Confirmation — {event_name}',
          custom_footer_text: body.custom_footer_text || null,
          logo_url: body.logo_url || null,
          primary_color: body.primary_color || null,
          footer_html: body.footer_html || null,
          updated_at: new Date().toISOString(),
        })
        .eq('wedding_id', weddingId)
        .select()
        .single()

      if (error) {
        console.error('Error updating email config:', error)
        return NextResponse.json(
          { error: 'Failed to update email configuration' },
          { status: 500 }
        )
      }

      updatedConfig = data
    } else {
      // Create new config
      const { data, error } = await supabase
        .from('wedding_email_config')
        .insert({
          wedding_id: weddingId,
          from_name: body.from_name,
          from_email: body.from_email,
          reply_to_email: body.reply_to_email || null,
          invitation_subject_template: body.invitation_subject_template || "You're Invited, {guest_name} — {event_name}",
          rsvp_confirmation_subject_template: body.rsvp_confirmation_subject_template || 'RSVP Confirmation — {event_name}',
          custom_footer_text: body.custom_footer_text || null,
          logo_url: body.logo_url || null,
          primary_color: body.primary_color || null,
          footer_html: body.footer_html || null,
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating email config:', error)
        return NextResponse.json(
          { error: 'Failed to create email configuration' },
          { status: 500 }
        )
      }

      updatedConfig = data
    }

    // Invalidate cache to ensure fresh data is fetched
    await invalidateEmailConfigCache(weddingId)

    // Fetch and return updated config with all related data
    const emailConfigData = await getEmailConfig(weddingId)

    return NextResponse.json(emailConfigData)
  } catch (error) {
    console.error('Error updating email config:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update email configuration' },
      { status: 500 }
    )
  }
}

