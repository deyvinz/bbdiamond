import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all travel sections
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('travel_info_sections')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching travel sections:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch travel sections' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      sections: data || []
    })
  } catch (error) {
    console.error('Error in travel sections GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new travel section
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { section_type, title, description, display_order } = body

    if (!section_type || !title) {
      return NextResponse.json(
        { success: false, error: 'Section type and title are required' },
        { status: 400 }
      )
    }

    if (!['accommodation', 'transportation', 'local-info'].includes(section_type)) {
      return NextResponse.json(
        { success: false, error: 'Section type must be accommodation, transportation, or local-info' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('travel_info_sections')
      .insert({
        wedding_id: weddingId,
        section_type,
        title,
        description: description || null,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding travel section:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add travel section' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      section: data
    })
  } catch (error) {
    console.error('Error in travel sections POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

