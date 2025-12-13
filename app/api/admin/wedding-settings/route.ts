import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import { supabaseServer } from '@/lib/supabase-server'

// GET - Get wedding settings
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { data: wedding, error } = await supabase
      .from('weddings')
      .select(
        'enable_seating, enable_guest_notes, enable_things_to_do, enable_registry, show_dietary_restrictions, show_additional_dietary_info, rsvp_banner_days_before'
      )
      .eq('id', weddingId)
      .single()

    if (error) {
      console.error('Error fetching wedding settings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wedding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        enable_seating: wedding?.enable_seating || false,
        enable_guest_notes: wedding?.enable_guest_notes || false,
        enable_things_to_do: wedding?.enable_things_to_do || false,
        enable_registry: wedding?.enable_registry || false,
        show_dietary_restrictions: wedding?.show_dietary_restrictions ?? true,
        show_additional_dietary_info: wedding?.show_additional_dietary_info ?? true,
        rsvp_banner_days_before: wedding?.rsvp_banner_days_before ?? 30,
      },
    })
  } catch (error) {
    console.error('Error in wedding settings GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT - Update wedding settings
export async function PUT(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const body = await request.json()
    const {
      enable_seating,
      enable_guest_notes,
      enable_things_to_do,
      enable_registry,
      show_dietary_restrictions,
      show_additional_dietary_info,
      rsvp_banner_days_before,
    } = body

    const supabase = await supabaseServer()

    const updateData: any = {}
    if (typeof enable_seating === 'boolean') updateData.enable_seating = enable_seating
    if (typeof enable_guest_notes === 'boolean') updateData.enable_guest_notes = enable_guest_notes
    if (typeof enable_things_to_do === 'boolean') updateData.enable_things_to_do = enable_things_to_do
    if (typeof enable_registry === 'boolean') updateData.enable_registry = enable_registry
    if (typeof show_dietary_restrictions === 'boolean') {
      updateData.show_dietary_restrictions = show_dietary_restrictions
    }
    if (typeof show_additional_dietary_info === 'boolean') {
      updateData.show_additional_dietary_info = show_additional_dietary_info
    }
    if (rsvp_banner_days_before !== undefined) {
      const parsedDays = Number.parseInt(String(rsvp_banner_days_before), 10)
      if (!Number.isFinite(parsedDays) || parsedDays < 1 || parsedDays > 365) {
        return NextResponse.json(
          { success: false, error: 'rsvp_banner_days_before must be between 1 and 365 days' },
          { status: 400 }
        )
      }
      updateData.rsvp_banner_days_before = parsedDays
    }

    const { data: wedding, error } = await supabase
      .from('weddings')
      .update(updateData)
      .eq('id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wedding settings:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update wedding settings' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      settings: {
        enable_seating: wedding?.enable_seating || false,
        enable_guest_notes: wedding?.enable_guest_notes || false,
        enable_things_to_do: wedding?.enable_things_to_do || false,
        enable_registry: wedding?.enable_registry || false,
        show_dietary_restrictions: wedding?.show_dietary_restrictions ?? true,
        show_additional_dietary_info: wedding?.show_additional_dietary_info ?? true,
        rsvp_banner_days_before: wedding?.rsvp_banner_days_before ?? 30,
      },
    })
  } catch (error) {
    console.error('Error in wedding settings PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

