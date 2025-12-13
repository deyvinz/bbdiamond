import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update registry
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { title, description, url, priority } = body

    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description
    if (url !== undefined) updateData.url = url || null
    if (priority !== undefined) updateData.priority = priority

    const { data, error } = await supabase
      .from('registries')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating registry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update registry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      registry: data
    })
  } catch (error) {
    console.error('Error in registry PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove registry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('registries')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting registry:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete registry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Registry deleted successfully'
    })
  } catch (error) {
    console.error('Error in registry DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

