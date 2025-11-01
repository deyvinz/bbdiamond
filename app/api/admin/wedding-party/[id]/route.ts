import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// PUT - Update wedding party member
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { name, role, image_url, bio, display_order } = body

    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (role !== undefined) updateData.role = role
    if (image_url !== undefined) updateData.image_url = image_url
    if (bio !== undefined) updateData.bio = bio
    if (display_order !== undefined) updateData.display_order = display_order

    const { data, error } = await supabase
      .from('wedding_party')
      .update(updateData)
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wedding party member:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update wedding party member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      member: data
    })
  } catch (error) {
    console.error('Error in wedding-party PUT:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE - Remove wedding party member
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()

    const { error } = await supabase
      .from('wedding_party')
      .delete()
      .eq('id', id)
      .eq('wedding_id', weddingId)

    if (error) {
      console.error('Error deleting wedding party member:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete wedding party member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Wedding party member deleted successfully'
    })
  } catch (error) {
    console.error('Error in wedding-party DELETE:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

