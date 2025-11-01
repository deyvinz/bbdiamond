import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update gallery image
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { url, caption, sort_order } = body

    const updateData: any = {}
    if (url !== undefined) updateData.image_url = url
    if (caption !== undefined) updateData.caption = caption
    if (sort_order !== undefined) updateData.display_order = sort_order

    const { data, error } = await supabase
      .from('gallery_images')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating gallery image:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update gallery image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      image: data
    })
  } catch (error) {
    console.error('Error in gallery PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove gallery image
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting gallery image:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete gallery image' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Gallery image deleted successfully'
    })
  } catch (error) {
    console.error('Error in gallery DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
