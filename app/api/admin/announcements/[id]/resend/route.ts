import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'

export async function POST(
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

    // Reset announcement for resending
    const { data, error } = await supabase.rpc('resend_announcement', {
      p_announcement_id: id
    })

    if (error) {
      console.error('Error resending announcement:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to reset announcement for resending' },
        { status: 500 }
      )
    }

    if (!data.success) {
      return NextResponse.json(
        { success: false, error: data.message },
        { status: 400 }
      )
    }

    // Invalidate cache
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: 'Announcement reset for resending'
    })

  } catch (error) {
    console.error('Error resending announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
