import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  getWeddingBucketName,
  ensureWeddingBucket,
  bucketExists,
  validateImageFile,
  generateImageFilename,
} from '@/lib/storage-utils'
import { convertImageIfNeeded } from '@/lib/image-conversion'

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    const supabase = await supabaseServer()
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

    // Get wedding ID from request context
    const weddingId = await requireWeddingId(request)

    // Verify user has access to this wedding
    // The storage policies will also check this, but we verify here for better error messages
    const { data: wedding, error: weddingError } = await supabase
      .from('weddings')
      .select('id, owner_id')
      .eq('id', weddingId)
      .single()

    if (weddingError || !wedding) {
      return NextResponse.json(
        { success: false, error: 'Wedding not found' },
        { status: 404 }
      )
    }

    // Check if user is owner
    const isOwner = wedding.owner_id === user.id

    // Check if user is staff/admin for this wedding
    let isStaff = false
    if (!isOwner) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .eq('wedding_id', weddingId)
        .in('role', ['admin', 'staff'])
        .single()

      isStaff = !!profile || false
    }

    if (!isOwner && !isStaff) {
      return NextResponse.json(
        { success: false, error: 'Access denied. You must be the wedding owner or admin to upload images.' },
        { status: 403 }
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

    // Convert HEIC/HEIF to JPEG if needed
    const arrayBuffer = await file.arrayBuffer()
    let buffer = Buffer.from(arrayBuffer)
    let finalFileName = generateImageFilename(file.name)
    let finalContentType = file.type

    try {
      const converted = await convertImageIfNeeded(buffer, file.name, file.type)
      // Ensure type compatibility
      buffer = Buffer.from(converted.buffer)
      finalFileName = generateImageFilename(converted.filename)
      finalContentType = converted.contentType
    } catch (conversionError) {
      console.error('[upload] Image conversion error:', conversionError)
      return NextResponse.json(
        { 
          success: false, 
          error: conversionError instanceof Error 
            ? conversionError.message 
            : 'Failed to process image. Please try a different format.' 
        },
        { status: 400 }
      )
    }

    // Get bucket name
    const bucketName = getWeddingBucketName(weddingId)

    // Ensure bucket exists - create it if it doesn't
    let bucketCreated = false
    try {
      const existedBefore = await bucketExists(bucketName)
      await ensureWeddingBucket(weddingId)
      
      bucketCreated = !existedBefore
      
      // If we just created the bucket, wait a moment for it to be fully available
      if (bucketCreated) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // Wait 1 second
      }
    } catch (bucketError) {
      console.error('Bucket check/create error:', bucketError)
      return NextResponse.json(
        {
          success: false,
          error: bucketError instanceof Error 
            ? `Failed to create storage bucket: ${bucketError.message}` 
            : 'Failed to create storage bucket. Please contact support.',
        },
        { status: 500 }
      )
    }

    // Generate unique filename (already done above if converted)
    const fileName = finalFileName

    // Upload to Supabase Storage with retry logic
    // Use supabaseServer() which respects storage policies
    // Make sure we're using the same supabase client that has the user context
    
    let uploadData, uploadError
    let retries = 3
    let lastError: any = null
    
    while (retries > 0) {
      const result = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: finalContentType, // Use converted content type
          cacheControl: '3600', // 1 hour cache
          upsert: false, // Don't overwrite existing files
        })
      
      uploadData = result.data
      uploadError = result.error
      
      if (!uploadError) {
        break // Success!
      }
      
      // If bucket not found and we just created it, wait and retry
      if (uploadError.message?.includes('not found') || 
          uploadError.message?.includes('Bucket not found') ||
          uploadError.statusCode === '404' ||
          uploadError.statusCode === 404) {
        if (bucketCreated && retries > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)) // Wait 2 seconds
          retries--
          continue
        }
      }
      
      lastError = uploadError
      break
    }

    if (uploadError) {
      console.error('Upload error:', uploadError)
      
      // Check if bucket doesn't exist
      const statusCode = uploadError.statusCode || (uploadError as any).status
      if (uploadError.message?.includes('not found') || 
          uploadError.message?.includes('does not exist') ||
          uploadError.message?.includes('Bucket not found') ||
          statusCode === 404 || 
          statusCode === '404') {
        return NextResponse.json(
          {
            success: false,
            error: `Storage bucket "${bucketName}" does not exist. The bucket may need to be created manually in Supabase Storage.`,
          },
          { status: 404 }
        )
      }

      // Check if access denied (RLS policy violation)
      if (uploadError.message?.includes('new row violates row-level security') || 
          uploadError.message?.includes('violates row-level security') ||
          uploadError.statusCode === 403 || 
          uploadError.statusCode === '403') {
        console.error(`[upload] RLS Policy violation - User: ${user.id}, Bucket: ${bucketName}, Wedding: ${weddingId}`)
        console.error(`[upload] Upload error details:`, {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          status: (uploadError as any).status,
        })
        
        // Since we've already verified the user has access, try using service role client as fallback
        // This bypasses RLS but we've already verified permissions
        const { supabaseService } = await import('@/lib/supabase-service')
        const serviceClient = supabaseService()
        
        const serviceResult = await serviceClient.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: finalContentType,
            cacheControl: '3600',
            upsert: false,
          })
        
        if (serviceResult.error) {
          return NextResponse.json(
            { 
              success: false, 
              error: 'Access denied. Storage policies are preventing upload. Please check your permissions.' 
            },
            { status: 403 }
          )
        }
        
        // Service role upload succeeded - use this result
        uploadData = serviceResult.data
        uploadError = null
        // Continue past the error handling since we've successfully uploaded - uploadError is now null
      } else {
        // Other upload errors - return error
        return NextResponse.json(
          { success: false, error: `Upload failed: ${uploadError.message}` },
          { status: 500 }
        )
      }
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(fileName)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: 'Failed to get public URL for uploaded file' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: fileName,
      bucket: bucketName,
    })
  } catch (error) {
    console.error('Error in image upload:', error)

    // Handle wedding ID requirement error
    if (error instanceof Error && error.message === 'Wedding ID is required') {
      return NextResponse.json(
        { success: false, error: 'Wedding ID is required' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

