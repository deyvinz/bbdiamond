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

    // Get announcement details
    const { data: announcement, error: announcementError } = await supabase
      .from('announcements')
      .select('*')
      .eq('id', id)
      .single()

    if (announcementError) {
      console.error('Error fetching announcement:', announcementError)
      return NextResponse.json(
        { success: false, error: 'Announcement not found' },
        { status: 404 }
      )
    }

    // Check if announcement can be sent
    if (announcement.status === 'sending') {
      return NextResponse.json(
        { success: false, error: 'Announcement is already being sent' },
        { status: 400 }
      )
    }

    if (announcement.status === 'sent') {
      return NextResponse.json(
        { success: false, error: 'Announcement has already been sent' },
        { status: 400 }
      )
    }

    // Update status to sending
    const { error: updateError } = await supabase
      .from('announcements')
      .update({ status: 'sending' })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating announcement status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Failed to update announcement status' },
        { status: 500 }
      )
    }

    // Get pending recipients
    const { data: recipients, error: recipientsError } = await supabase
      .from('announcement_recipients')
      .select(`
        id,
        guest_id,
        email,
        guest:guests(
          first_name,
          last_name
        )
      `)
      .eq('announcement_id', id)
      .eq('status', 'pending')
      .limit(announcement.batch_size)

    if (recipientsError) {
      console.error('Error fetching recipients:', recipientsError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch recipients' },
        { status: 500 }
      )
    }

    if (!recipients || recipients.length === 0) {
      // No more recipients to send to
      await supabase
        .from('announcements')
        .update({ status: 'sent' })
        .eq('id', id)
      
      await bumpNamespaceVersion()
      
      return NextResponse.json({
        success: true,
        message: 'No more recipients to send to. Announcement marked as sent.'
      })
    }

    // Create batch record
    const { data: batch, error: batchError } = await supabase
      .from('announcement_batches')
      .insert({
        announcement_id: id,
        batch_number: 1, // This should be calculated based on existing batches
        total_in_batch: recipients.length,
        status: 'sending',
        started_at: new Date().toISOString()
      })
      .select()
      .single()

    if (batchError) {
      console.error('Error creating batch:', batchError)
      return NextResponse.json(
        { success: false, error: 'Failed to create batch record' },
        { status: 500 }
      )
    }

    // Call Supabase Edge Function to send emails
    const { data: edgeFunctionResult, error: edgeFunctionError } = await supabase.functions.invoke('send-announcement-emails', {
      body: {
        announcement_id: id,
        batch_id: batch.id,
        recipients: recipients.map((r: any) => ({
          id: r.id,
          email: r.email,
          guest_name: `${r.guest?.first_name || ''} ${r.guest?.last_name || ''}`.trim()
        })),
        announcement: {
          title: announcement.title,
          subject: announcement.subject,
          content: announcement.content
        }
      }
    })

    if (edgeFunctionError) {
      console.error('Error calling edge function:', edgeFunctionError)
      
      // Update batch status to failed
      await supabase
        .from('announcement_batches')
        .update({ status: 'failed' })
        .eq('id', batch.id)

      // Update announcement status back to draft
      await supabase
        .from('announcements')
        .update({ status: 'draft' })
        .eq('id', id)

      await bumpNamespaceVersion()

      return NextResponse.json(
        { success: false, error: 'Failed to send emails' },
        { status: 500 }
      )
    }

    // Invalidate cache
    await bumpNamespaceVersion()

    return NextResponse.json({
      success: true,
      message: `Batch of ${recipients.length} emails queued for sending`,
      batch_id: batch.id
    })

  } catch (error) {
    console.error('Error sending announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
