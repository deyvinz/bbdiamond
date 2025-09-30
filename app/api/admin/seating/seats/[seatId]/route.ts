import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ seatId: string }> }
) {
  try {
    const { seatId } = await params

    if (!seatId) {
      return NextResponse.json({ 
        success: false, 
        message: 'Seat ID is required' 
      }, { status: 400 })
    }

    const supabase = await supabaseServer()

    // Remove the seat assignment
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
