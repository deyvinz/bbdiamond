import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function PUT(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const { updates } = await request.json()

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ 
        success: false, 
        message: 'Updates array is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Get all table IDs to verify they belong to this wedding
    const tableIds = updates.map(({ id }) => id)
    
    // Verify all tables belong to this wedding (via events)
    const { data: tables, error: verifyError } = await supabase
      .from('seating_tables')
      .select(`
        id,
        event_id,
        event:events!inner(
          id,
          wedding_id
        )
      `)
      .in('id', tableIds)

    if (verifyError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to verify tables' 
      }, { status: 500 })
    }

    // Verify all tables belong to this wedding
    const invalidTables = tables?.filter((table: any) => {
      const event = table.event as any
      return !event || event.wedding_id !== weddingId
    })

    if (invalidTables && invalidTables.length > 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Some tables not found or access denied' 
      }, { status: 403 })
    }

    // Update table positions (now verified to belong to this wedding)
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
