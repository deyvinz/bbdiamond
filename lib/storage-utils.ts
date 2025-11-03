import { supabaseService } from './supabase-service'

const STORAGE_BUCKET_PREFIX = process.env.NEXT_PUBLIC_STORAGE_BUCKET_PREFIX || 'wedding-'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB default
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
]

/**
 * Get the bucket name for a wedding
 * @param weddingId - The wedding UUID
 * @returns The bucket name in format: wedding-{wedding_id}
 */
export function getWeddingBucketName(weddingId: string): string {
  return `${STORAGE_BUCKET_PREFIX}${weddingId}`
}

/**
 * Check if a bucket exists by trying to access it via the Storage REST API
 * This is more reliable than trying to list files
 */
export async function bucketExists(bucketName: string): Promise<boolean> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.warn('[bucketExists] Missing credentials, assuming bucket does not exist')
      return false
    }
    
    // Use the Storage API to check if bucket exists
    // GET /storage/v1/bucket/{id} returns the bucket if it exists
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket/${bucketName}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
    })
    
    console.log(`[bucketExists] Check for ${bucketName}: status ${response.status}`)
    
    if (response.status === 404 || response.status === 400) {
      return false
    }
    
    if (response.ok) {
      const data = await response.json()
      console.log(`[bucketExists] Bucket ${bucketName} exists:`, !!data)
      return !!data
    }
    
    // For other errors, assume bucket doesn't exist
    const errorText = await response.text()
    console.warn(`[bucketExists] Unexpected status ${response.status} for ${bucketName}:`, errorText)
    return false
  } catch (error) {
    // If we get an error, assume bucket doesn't exist
    console.warn(`[bucketExists] Error checking bucket existence:`, error)
    return false
  }
}

/**
 * Create a wedding-specific storage bucket if it doesn't exist
 * @param weddingId - The wedding UUID
 * @returns The bucket name
 */
export async function ensureWeddingBucket(weddingId: string): Promise<string> {
  const bucketName = getWeddingBucketName(weddingId)
  
  console.log(`[ensureWeddingBucket] Starting for bucket: ${bucketName}`)
  
  try {
    // Check if bucket exists
    console.log(`[ensureWeddingBucket] Checking if bucket exists: ${bucketName}`)
    const exists = await bucketExists(bucketName)
    console.log(`[ensureWeddingBucket] Bucket exists: ${exists}`)
    
    if (exists) {
      console.log(`[ensureWeddingBucket] Bucket ${bucketName} already exists, returning`)
      return bucketName
    }
    
    // Create bucket using Supabase Storage REST API
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error(`[ensureWeddingBucket] Missing credentials - URL: ${!!supabaseUrl}, Key: ${!!supabaseServiceKey}`)
      throw new Error('Missing Supabase credentials for bucket creation')
    }
    
    // Create bucket via REST API using Supabase Storage Management API
    console.log(`[ensureWeddingBucket] Attempting to create bucket: ${bucketName}`)
    console.log(`[ensureWeddingBucket] Using URL: ${supabaseUrl}/storage/v1/bucket`)
    const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'apikey': supabaseServiceKey,
      },
      body: JSON.stringify({
        id: bucketName,
        name: bucketName,
        public: true, // Public bucket for read access
        file_size_limit: 5242880, // 5MB in bytes
        allowed_mime_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
      }),
    })
    
    const responseText = await response.text()
    console.log(`[ensureWeddingBucket] Response status: ${response.status} ${response.statusText}`)
    console.log(`[ensureWeddingBucket] Response body: ${responseText}`)
    
    if (!response.ok) {
      let errorMessage = `Failed to create bucket: ${response.status} ${response.statusText}`
      
      try {
        const errorJson = JSON.parse(responseText)
        console.log(`[ensureWeddingBucket] Parsed error JSON:`, errorJson)
        if (errorJson.message) {
          errorMessage = errorJson.message
        }
        if (errorJson.error) {
          errorMessage = errorJson.error
        }
        // If bucket already exists (race condition), that's okay
        if (errorJson.message?.includes('already exists') || 
            errorJson.message?.includes('duplicate') ||
            errorJson.error?.includes('already exists') ||
            errorJson.error?.includes('duplicate')) {
          console.log(`[ensureWeddingBucket] Bucket ${bucketName} already exists (created by another request)`)
          return bucketName
        }
      } catch (parseError) {
        // If we can't parse the error, use the default message
        console.error(`[ensureWeddingBucket] Error response (could not parse JSON):`, responseText)
      }
      
      console.error(`[ensureWeddingBucket] Bucket creation failed for ${bucketName}:`, errorMessage)
      throw new Error(errorMessage)
    }
    
    console.log(`[ensureWeddingBucket] Successfully created bucket: ${bucketName}`)
    return bucketName
  } catch (error) {
    console.error(`Error ensuring bucket ${bucketName}:`, error)
    
    // If it's a "bucket exists" error, return the bucket name anyway
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (errorMessage.includes('already exists') || errorMessage.includes('duplicate')) {
      return bucketName
    }
    
    throw new Error(`Failed to ensure bucket exists: ${errorMessage}`)
  }
}

/**
 * Validate image file
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    }
  }
  
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `File type ${file.type} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }
  }
  
  // Check file extension as additional validation
  const extension = file.name.split('.').pop()?.toLowerCase()
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  if (!extension || !allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension .${extension} is not allowed. Allowed extensions: ${allowedExtensions.join(', ')}`,
    }
  }
  
  return { valid: true }
}

/**
 * Generate a unique filename for uploaded images
 * Format: images/{timestamp}-{uuid}.{ext}
 */
export function generateImageFilename(originalFilename: string): string {
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()
  const extension = originalFilename.split('.').pop()?.toLowerCase() || 'jpg'
  return `images/${timestamp}-${uuid}.${extension}`
}

/**
 * Get public URL for a file in storage
 */
export function getStoragePublicUrl(bucketName: string, filePath: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
  }
  
  // Construct public URL manually
  // Format: https://{project}.supabase.co/storage/v1/object/public/{bucket}/{path}
  const url = new URL(supabaseUrl)
  return `${url.protocol}//${url.host}/storage/v1/object/public/${bucketName}/${filePath}`
}

