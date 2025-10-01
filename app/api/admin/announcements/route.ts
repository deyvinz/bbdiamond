import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { bumpNamespaceVersion } from '@/lib/cache'
import type { CreateAnnouncementRequest, AnnouncementListResponse, AnnouncementFilters, PaginationParams } from '@/lib/types/announcements'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const supabase = await supabaseServer()

    // Build query
    let query = supabase
      .from('announcements')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,subject.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: announcements, error, count } = await query

    if (error) {
      console.error('Error fetching announcements:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch announcements' },
        { status: 500 }
      )
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    const response: AnnouncementListResponse = {
      announcements: announcements || [],
      total_count: totalCount,
      page,
      page_size: pageSize,
      total_pages: totalPages
    }

    return NextResponse.json({
      success: true,
      ...response
    })

  } catch (error) {
    console.error('Error in announcements API:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateAnnouncementRequest = await request.json()
    const { title, content, subject, guest_ids, send_to_all, scheduled_at, batch_size } = body

    // Validate required fields
    if (!title || !content || !subject) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and subject are required' },
        { status: 400 }
      )
    }

    // Validate batch size
    if (batch_size && (batch_size < 20 || batch_size > 100)) {
      return NextResponse.json(
        { success: false, error: 'Batch size must be between 20 and 100' },
        { status: 400 }
      )
    }

    // Validate recipient selection
    if (!send_to_all && (!guest_ids || guest_ids.length === 0)) {
      return NextResponse.json(
        { success: false, error: 'Either select specific guests or send to all' },
        { status: 400 }
      )
    }

    const supabase = await supabaseServer()

    // Call the database function to create announcement with recipients
    const { data, error } = await supabase.rpc('create_announcement_with_recipients', {
      p_title: title,
      p_content: content,
      p_subject: subject,
      p_guest_ids: guest_ids || null,
      p_send_to_all: send_to_all || false,
      p_scheduled_at: scheduled_at || null,
      p_batch_size: batch_size || 50
    })

    if (error) {
      console.error('Error creating announcement:', error)
      return NextResponse.json(
        { success: false, error: 'Failed to create announcement' },
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
      announcement_id: data.announcement_id,
      recipient_count: data.recipient_count,
      message: 'Announcement created successfully'
    })

  } catch (error) {
    console.error('Error creating announcement:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
