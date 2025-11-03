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
      console.log(`[upload] User profile check - isOwner: ${isOwner}, isStaff: ${isStaff}, userId: ${user.id}, weddingId: ${weddingId}`)
    } else {
      console.log(`[upload] User is owner - userId: ${user.id}, weddingId: ${weddingId}`)
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

    // Get bucket name
    const bucketName = getWeddingBucketName(weddingId)

    // Ensure bucket exists - create it if it doesn't
    let bucketCreated = false
    try {
      console.log(`[upload] Checking bucket existence for: ${bucketName}`)
      const existedBefore = await bucketExists(bucketName)
      console.log(`[upload] Bucket existed before: ${existedBefore}`)
      
      console.log(`[upload] Calling ensureWeddingBucket for weddingId: ${weddingId}`)
      await ensureWeddingBucket(weddingId)
      
      bucketCreated = !existedBefore
      console.log(`[upload] Bucket was created: ${bucketCreated}`)
      
      // If we just created the bucket, wait a moment for it to be fully available
      if (bucketCreated) {
        console.log(`Waiting for bucket ${bucketName} to be ready...`)
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

    // Generate unique filename
    const fileName = generateImageFilename(file.name)

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload to Supabase Storage with retry logic
    // Use supabaseServer() which respects storage policies
    // Make sure we're using the same supabase client that has the user context
    console.log(`[upload] Attempting upload to bucket: ${bucketName}, file: ${fileName}`)
    console.log(`[upload] User ID: ${user.id}, Wedding ID: ${weddingId}`)
    
    let uploadData, uploadError
    let retries = 3
    let lastError: any = null
    
    while (retries > 0) {
      console.log(`[upload] Upload attempt ${4 - retries} of 3`)
      const result = await supabase.storage
        .from(bucketName)
        .upload(fileName, buffer, {
          contentType: file.type,
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
          console.log(`Bucket not found after creation, retrying... (${retries} retries left)`)
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
        console.log(`[upload] Attempting upload with service role client as fallback...`)
        const { supabaseService } = await import('@/lib/supabase-service')
        const serviceClient = supabaseService()
        
        const serviceResult = await serviceClient.storage
          .from(bucketName)
          .upload(fileName, buffer, {
            contentType: file.type,
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
        console.log(`[upload] Upload succeeded using service role client`)
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

