import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update food choice
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params
    const body = await request.json()
    const { name, description, display_order, is_active } = body

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Food choice name is required' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    const updateData: any = {
      name: name.trim(),
      description: description?.trim() || null,
      updated_at: new Date().toISOString()
    }

    if (display_order !== undefined) {
      updateData.display_order = display_order
    }

    if (is_active !== undefined) {
      updateData.is_active = is_active
    }

    const { data, error } = await supabase
      .from('wedding_food_choices')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating food choice:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Food choice not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update food choice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      food_choice: data
    })
  } catch (error) {
    console.error('Error in food choices PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Delete food choice (soft delete by setting is_active to false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params

    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('wedding_food_choices')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting food choice:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { success: false, error: 'Food choice not found' },
          { status: 404 }
        )
      }
      return NextResponse.json(
        { success: false, error: 'Failed to delete food choice' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Food choice deleted successfully'
    })
  } catch (error) {
    console.error('Error in food choices DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

