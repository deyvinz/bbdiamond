import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all travel items
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    // Get section IDs for this wedding first
    const { data: sections, error: sectionsError } = await supabase
      .from('travel_info_sections')
      .select('id')
      .eq('wedding_id', weddingId)

    if (sectionsError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sections' },
        { status: 500 }
      )
    }

    const sectionIds = (sections || []).map(s => s.id)
    
    if (sectionIds.length === 0) {
      return NextResponse.json({
        success: true,
        items: []
      })
    }

    const { data, error } = await supabase
      .from('travel_info_items')
      .select('*')
      .in('section_id', sectionIds)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching travel items:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: data || []
    })
  } catch (error) {
    console.error('Error in travel items GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new travel item
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { section_id, name, description, address, phone, website, details, tips, display_order } = body

    if (!section_id || !name) {
      return NextResponse.json(
        { success: false, error: 'Section ID and name are required' },
        { status: 400 }
      )
    }

    // Verify section belongs to this wedding
    const { data: section, error: sectionError } = await supabase
      .from('travel_info_sections')
      .select('id')
      .eq('id', section_id)
      .eq('wedding_id', weddingId)
      .single()

    if (sectionError || !section) {
      return NextResponse.json(
        { success: false, error: 'Invalid section' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('travel_info_items')
      .insert({
        section_id,
        name,
        description: description || null,
        address: address || null,
        phone: phone || null,
        website: website || null,
        details: details || null,
        tips: tips || null,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding travel item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add travel item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error) {
    console.error('Error in travel items POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

