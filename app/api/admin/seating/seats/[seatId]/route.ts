import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'
import { requireWeddingId } from '@/lib/api-wedding-context'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seatId: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { seatId } = await params

    if (!seatId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Seat ID is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Verify seat belongs to this wedding (via table -> event)
    const { data: seat, error: seatError } = await supabase
      .from('seats')
      .select(`
        id,
        table_id,
        table:seating_tables!inner(
          id,
          event_id,
          event:events!inner(
            id,
            wedding_id
          )
        )
      `)
      .eq('id', seatId)
      .single()

    if (seatError || !seat) {
      return NextResponse.json({ 
        success: false, 
        message: 'Seat not found' 
      }, { status: 404 })
    }

    const table = seat.table as any
    const event = table?.event as any
    if (!event || event.wedding_id !== weddingId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Seat not found or access denied' 
      }, { status: 403 })
    }

    // Remove the seat assignment (now verified to belong to this wedding)
    const { error } = await supabase
      .from('seats')
      .delete()
      .eq('id', seatId)

    if (error) {
      console.error('Error removing seat assignment:', error)
      return NextResponse.json({ 
        success: false, 
        message: 'Failed to remove seat assignment' 
      }, { status: 500 })
    }

    // Invalidate cache to refresh seating data
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: 'Seat assignment removed successfully'
    })

  } catch (error) {
    console.error('Error in remove seat API:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 })
  }
}
