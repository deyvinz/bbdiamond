import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch food choices for the wedding
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const url = new URL(request.url)
    const showAll = url.searchParams.get('all') === 'true'
    
    let query = supabase
      .from('wedding_food_choices')
      .select('*')
      .eq('wedding_id', weddingId)
    
    if (!showAll) {
      query = query.eq('is_active', true)
    }
    
    const { data, error } = await query.order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching food choices:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch food choices' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      food_choices: data || []
    })
  } catch (error) {
    console.error('Error in food choices GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new food choice
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const body = await request.json()
    const { name, description, display_order } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Food choice name is required' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Get max display_order if not provided
    let order = display_order
    if (order === undefined || order === null) {
      const { data: existing } = await supabase
        .from('wedding_food_choices')
        .select('display_order')
        .eq('wedding_id', weddingId)
        .order('display_order', { ascending: false })
        .limit(1)
        .single()
      
      order = existing?.display_order !== undefined ? (existing.display_order + 1) : 0
    }

    const { data, error } = await supabase
      .from('wedding_food_choices')
      .insert({
        wedding_id: weddingId,
        name: name.trim(),
        description: description?.trim() || null,
        display_order: order,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating food choice:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create food choice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      food_choice: data
    }, { status: 201 })
  } catch (error) {
    console.error('Error in food choices POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

