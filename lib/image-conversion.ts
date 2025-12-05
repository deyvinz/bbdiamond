import sharp from 'sharp'

/**
 * Convert HEIC/HEIF images to JPEG for web compatibility
 * Returns the converted buffer and new filename, or original if conversion not needed
 */
export async function convertImageIfNeeded(
  buffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
  const isHeic = mimeType === 'image/heic' || mimeType === 'image/heif'
  const extension = originalFilename.split('.').pop()?.toLowerCase()
  const isHeicExtension = extension === 'heic' || extension === 'heif'

  // If it's not HEIC/HEIF, return as-is
  if (!isHeic && !isHeicExtension) {
    return {
      buffer,
      filename: originalFilename,
      contentType: mimeType,
    }
  }

  try {
    // Convert HEIC/HEIF to JPEG using sharp
    const jpegBuffer = await sharp(buffer)
      .jpeg({ quality: 90, mozjpeg: true })
      .toBuffer()

    // Ensure type compatibility by creating a new Buffer
    const convertedBuffer = Buffer.from(jpegBuffer)

    // Update filename to use .jpg extension
    const baseFilename = originalFilename.replace(/\.[^.]+$/, '')
    const newFilename = `${baseFilename}.jpg`

    return {
      buffer: convertedBuffer,
      filename: newFilename,
      contentType: 'image/jpeg',
    }
  } catch (error) {
    console.error(`[convertImageIfNeeded] Error converting image:`, error)
    // If conversion fails, try to return original (might fail on upload, but better than silent failure)
    throw new Error(`Failed to convert HEIC/HEIF image: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
