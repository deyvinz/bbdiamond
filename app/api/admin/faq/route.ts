import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all FAQ items
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('faq_items')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching FAQ items:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch FAQ items' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      items: data || []
    })
  } catch (error) {
    console.error('Error in FAQ GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new FAQ item
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { question, answer, display_order } = body

    if (!question || !answer) {
      return NextResponse.json(
        { success: false, error: 'Question and answer are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('faq_items')
      .insert({
        wedding_id: weddingId,
        question,
        answer,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding FAQ item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add FAQ item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error) {
    console.error('Error in FAQ POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

