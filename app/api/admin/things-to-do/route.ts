import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all things to do items
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('things_to_do')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching things to do:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch things to do' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: data || []
    })
  } catch (error) {
    console.error('Error in things-to-do GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new thing to do
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { title, description, map_url, website, sort_order } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('things_to_do')
      .insert({
        wedding_id: weddingId,
        title,
        description,
        map_url: map_url || null,
        website: website || null,
        sort_order: sort_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding thing to do:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add thing to do' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error) {
    console.error('Error in things-to-do POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

