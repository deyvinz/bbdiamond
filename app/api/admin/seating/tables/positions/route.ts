import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'

export async function PUT(request: NextRequest) {
  try {
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Updates array is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Update table positions
    const updatePromises = updates.map(({ id, pos_x, pos_y }) =>
      supabase
        .from('seating_tables')
        .update({ pos_x, pos_y })
        .eq('id', id)
    )

    const results = await Promise.all(updatePromises)
    
    // Check for errors
    const errors = results.filter(result => result.error)
    if (errors.length > 0) {
      console.error('Error updating table positions:', errors)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to update some table positions' 
      }, { status: 500 })
    }

    // Invalidate cache to refresh seating data
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: 'Table positions updated successfully'
    })

  } catch (error) {
    console.error('Error in update positions API:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
