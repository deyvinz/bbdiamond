import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'

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

    // Get announcement details
    const { data: announcement, error } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching announcement:', error)
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Get recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('announcement_recipients')
      .select(`
        id,
        guest_id,
        email,
        status,
        sent_at,
        error_message,
        created_at,
        guest:guests(
          id,
          first_name,
          last_name,
          email
        )
      `)
      .eq('announcement_id', id)
      .order('created_at')

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recipients' },
        { status: 500 }
      )
    }

    // Get batches
    const { data: batches, error: batchesError } = await supabase
      .from('announcement_batches')
      .select('*')
      .eq('announcement_id', id)
      .order('batch_number')

    if (batchesError) {
      console.error('Error fetching batches:', batchesError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch batches' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      announcement,
      recipients: recipients || [],
      batches: batches || []
    })

  } catch (error) {
    console.error('Error in announcement detail API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { title, content, subject, scheduled_at, batch_size } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Announcement ID is required' },
        { status: 400 }
      )
    }

    // Validate batch size if provided
    if (batch_size && (batch_size < 20 || batch_size > 100)) {
      return NextResponse.json(
        { success: false, error: 'Batch size must be between 20 and 100' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Update announcement
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (content !== undefined) updateData.content = content
    if (subject !== undefined) updateData.subject = subject
    if (scheduled_at !== undefined) updateData.scheduled_at = scheduled_at
    if (batch_size !== undefined) updateData.batch_size = batch_size

    const { data: announcement, error } = await supabase
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating announcement:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to update announcement' },
        { status: 500 }
      )
    }

    // Invalidate cache
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      announcement,
      message: 'Announcement updated successfully'
    })

  } catch (error) {
    console.error('Error updating announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Delete announcement (cascade will handle recipients and batches)
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting announcement:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to delete announcement' },
        { status: 500 }
      )
    }

    // Invalidate cache
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: 'Announcement deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
