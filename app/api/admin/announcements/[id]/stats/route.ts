import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Announcement ID is required' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Get announcement statistics
    const { data, error } = await supabase.rpc('get_announcement_stats', {
      p_announcement_id: id
    })

    if (error) {
      console.error('Error fetching announcement stats:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch announcement statistics' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      stats: data
    })

  } catch (error) {
    console.error('Error in announcement stats API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
