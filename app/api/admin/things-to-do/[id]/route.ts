import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update thing to do
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { title, description, map_url, website, sort_order } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (map_url !== undefined) updateData.map_url = map_url
    if (website !== undefined) updateData.website = website
    if (sort_order !== undefined) updateData.sort_order = sort_order

    const { data, error } = await supabase
      .from('things_to_do')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating thing to do:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update thing to do' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error) {
    console.error('Error in things-to-do PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove thing to do
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('things_to_do')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting thing to do:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete thing to do' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Thing to do deleted successfully'
    })
  } catch (error) {
    console.error('Error in things-to-do DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

