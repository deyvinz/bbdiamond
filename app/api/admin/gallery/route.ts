import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// GET - Fetch all gallery images
export async function GET(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('gallery_images')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching gallery images:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch gallery images' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      images: data || []
    })
  } catch (error) {
    console.error('Error in gallery GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new gallery image
export async function POST(request: NextRequest) {
  try {
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { url, caption, sort_order } = body

    if (!url) {
      return NextResponse.json(
        { success: false, error: 'Image URL is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('gallery_images')
      .insert({
        url,
        caption: caption || null,
        sort_order: sort_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding gallery image:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add gallery image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: data
    })
  } catch (error) {
    console.error('Error in gallery POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
