import { NextRequest, NextResponse } from 'next/server'
import { getWeddingContext } from '@/lib/wedding-context-server'

// GET - Fetch wedding info for client components
export async function GET(request: NextRequest) {
  try {
    const context = await getWeddingContext()
    
    if (!context) {
      return NextResponse.json({
        success: true,
        wedding: null
      })
    }

    // Get theme to check for logo
    const { getWeddingTheme } = await import('@/lib/theme-service')
    const theme = await getWeddingTheme(context.weddingId)
    
    return NextResponse.json({
      success: true,
      wedding: {
        couple_display_name: context.wedding.couple_display_name,
        bride_name: context.wedding.bride_name,
        groom_name: context.wedding.groom_name,
        hashtag: context.wedding.hashtag,
        contact_email: context.wedding.contact_email,
        logo_url: theme?.logo_url || null,
        show_dietary_restrictions: context.wedding.show_dietary_restrictions ?? true,
        show_additional_dietary_info: context.wedding.show_additional_dietary_info ?? true,
        rsvp_banner_days_before: context.wedding.rsvp_banner_days_before ?? 30,
        // Add all feature flags for navigation
        enable_travel: context.wedding.enable_travel ?? false,
        enable_wedding_party: context.wedding.enable_wedding_party ?? false,
        enable_registry: context.wedding.enable_registry ?? false,
        registry_url: context.wedding.registry_url || null,
        enable_gallery: context.wedding.enable_gallery ?? false,
        enable_faq: context.wedding.enable_faq ?? false,
        enable_seating: context.wedding.enable_seating ?? false,
        enable_things_to_do: context.wedding.enable_things_to_do ?? false,
        enable_guest_notes: context.wedding.enable_guest_notes ?? false,
      }
    })
  } catch (error) {
    console.error('Error fetching wedding info:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

