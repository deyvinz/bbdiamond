import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all registries
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('registries')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('priority', { ascending: true })

    if (error) {
      console.error('Error fetching registries:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch registries' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      registries: data || []
    })
  } catch (error) {
    console.error('Error in registry GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new registry
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { title, description, url, priority } = body

    if (!title || !description) {
      return NextResponse.json(
        { success: false, error: 'Title and description are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('registries')
      .insert({
        wedding_id: weddingId,
        title,
        description,
        url: url || null,
        priority: priority || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding registry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add registry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      registry: data
    })
  } catch (error) {
    console.error('Error in registry POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

