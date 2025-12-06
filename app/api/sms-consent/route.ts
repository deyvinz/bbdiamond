import { NextRequest, NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase-service'
import { getWeddingContext } from '@/lib/wedding-context-server'
import { formatPhoneForTwilio, validatePhoneNumber } from '@/lib/sms-service'

export async function POST(request: NextRequest) {
  try {
    const context = await getWeddingContext()

    if (!context) {
      return NextResponse.json(
        { success: false, error: 'Wedding context not found' },
        { status: 404 }
      )
    }

    const body = await request.json()
    const { phone_number, first_name, last_name } = body

    // Validate required fields
    if (!phone_number) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      )
    }

    // Format and validate phone number
    const formattedPhone = formatPhoneForTwilio(phone_number)

    if (!validatePhoneNumber(formattedPhone)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid phone number' },
        { status: 400 }
      )
    }

    const supabase = supabaseService()

    // Get request metadata for audit trail
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const consentMessage = `I agree to receive SMS notifications about the wedding from ${context.wedding?.couple_display_name || 'the wedding couple'}. Message and data rates may apply. Reply STOP to unsubscribe.`

    // Upsert consent record (update if exists, insert if not)
    const { data, error } = await supabase
      .from('sms_consent')
      .upsert(
        {
          wedding_id: context.weddingId,
          phone_number: formattedPhone,
          first_name: first_name?.trim() || null,
          last_name: last_name?.trim() || null,
          consent_given: true,
          consent_message: consentMessage,
          consent_timestamp: new Date().toISOString(),
          ip_address: ip,
          user_agent: userAgent,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'wedding_id,phone_number',
        }
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving SMS consent:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to save consent. Please try again.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you! You will now receive SMS notifications about the wedding.',
      data: {
        phone_number: formattedPhone,
        consent_timestamp: data.consent_timestamp,
      },
    })
  } catch (error) {
    console.error('SMS consent error:', error)
    return NextResponse.json(
      { success: false, error: 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}

