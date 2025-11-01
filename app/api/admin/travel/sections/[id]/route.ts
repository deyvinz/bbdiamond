import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update travel section
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { title, description, display_order } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabase
      .from('travel_info_sections')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating travel section:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update travel section' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      section: data
    })
  } catch (error) {
    console.error('Error in travel sections PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove travel section
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('travel_info_sections')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting travel section:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete travel section' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Travel section deleted successfully'
    })
  } catch (error) {
    console.error('Error in travel sections DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

