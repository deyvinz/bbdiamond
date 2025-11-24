import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  getWeddingBucketName,
  ensureWeddingBucket,
  validateImageFile,
  generateImageFilename,
} from '@/lib/storage-utils'
import { updateEvent } from '@/lib/events-service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params
    const supabase = await supabaseServer()

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify event exists and belongs to this wedding
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, wedding_id')
      .eq('id', id)
      .eq('wedding_id', weddingId)
      .single()

    if (eventError || !event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    // Get bucket name and ensure it exists
    const bucketName = getWeddingBucketName(weddingId)
    await ensureWeddingBucket(weddingId)

    // Generate unique filename for event picture
    const fileName = `events/${id}/${generateImageFilename(file.name)}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true, // Allow overwriting existing event pictures
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      )
    }

    // Update event with picture_url
    await updateEvent(id, { picture_url: urlData.publicUrl }, weddingId)

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
    })
  } catch (error) {
    console.error('Error in event picture upload:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

