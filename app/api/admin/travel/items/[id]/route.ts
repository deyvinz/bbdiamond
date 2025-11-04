import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update travel item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { name, description, address, phone, website, details, tips, display_order } = body

    // Verify item belongs to a section for this wedding
    const { data: item, error: itemError } = await supabase
      .from('travel_info_items')
      .select('section_id, travel_info_sections!inner(wedding_id)')
      .eq('id', id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const section = item.travel_info_sections as any
    if (section.wedding_id !== weddingId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (address !== undefined) updateData.address = address
    if (phone !== undefined) updateData.phone = phone
    if (website !== undefined) updateData.website = website
    if (details !== undefined) updateData.details = details
    if (tips !== undefined) updateData.tips = tips
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabase
      .from('travel_info_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating travel item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update travel item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      item: data
    })
  } catch (error) {
    console.error('Error in travel items PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove travel item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    // Verify item belongs to a section for this wedding
    const { data: item, error: itemError } = await supabase
      .from('travel_info_items')
      .select('section_id, travel_info_sections!inner(wedding_id)')
      .eq('id', id)
      .single()

    if (itemError || !item) {
      return NextResponse.json(
        { success: false, error: 'Item not found' },
        { status: 404 }
      )
    }

    const section = item.travel_info_sections as any
    if (section.wedding_id !== weddingId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const { error } = await supabase
      .from('travel_info_items')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting travel item:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete travel item' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Travel item deleted successfully'
    })
  } catch (error) {
    console.error('Error in travel items DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

