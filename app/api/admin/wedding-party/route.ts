import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'

// GET - Fetch all wedding party members
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    
    const { data, error } = await supabase
      .from('wedding_party')
      .select('*')
      .eq('wedding_id', weddingId)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching wedding party:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch wedding party members' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      members: data || []
    })
  } catch (error) {
    console.error('Error in wedding-party GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Add new wedding party member
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const supabase = await supabaseServer()
    const body = await request.json()
    
    const { name, role, image_url, bio, display_order } = body

    if (!name || !role) {
      return NextResponse.json(
        { success: false, error: 'Name and role are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('wedding_party')
      .insert({
        wedding_id: weddingId,
        name,
        role,
        image_url: image_url || null,
        bio: bio || null,
        display_order: display_order || 0
      })
      .select()
      .single()

    if (error) {
      console.error('Error adding wedding party member:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to add wedding party member' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      member: data
    })
  } catch (error) {
    console.error('Error in wedding-party POST:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

