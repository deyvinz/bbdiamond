import QRCode from 'qrcode'
import { supabaseServer } from './supabase-server'

export interface QRCodeOptions {
  width?: number
  margin?: number
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H'
  color?: {
    dark: string
    light: string
  }
}

export interface QRCodeResult {
  dataUrl: string
  buffer: Buffer
  publicUrl?: string
}

/**
 * Generate QR code for invitation token (check-in URL)
 */
export async function generateInvitationQR(
  token: string,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
  const checkinUrl = `${baseUrl}/checkin?token=${token}`
  
  const defaultOptions: QRCodeOptions = {
    width: 300,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#FFFFFF'
    },
    ...options
  }

  try {
    // Generate QR code as data URL
    const dataUrl = await QRCode.toDataURL(checkinUrl, defaultOptions)
    
    // Convert to buffer
    const base64Data = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    // Upload to Supabase Storage for public URL
    const supabase = await supabaseServer()
    const fileName = `qr-codes/invitation-${token}.png`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('bdiamond')
      .upload(fileName, buffer, {
        contentType: 'image/png',
        cacheControl: '31536000', // 1 year
        upsert: true
      })

    let publicUrl: string | undefined
    if (!uploadError && uploadData) {
      const { data: publicUrlData } = supabase.storage
        .from('bdiamond')
        .getPublicUrl(fileName)
      publicUrl = publicUrlData.publicUrl
    }

    return {
      dataUrl,
      buffer,
      publicUrl
    }
  } catch (error) {
    console.error('QR code generation error:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate QR code for email attachment (smaller size)
 */
export async function generateEmailQR(
  token: string,
  options: QRCodeOptions = {}
): Promise<QRCodeResult> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
  const checkinUrl = `${baseUrl}/checkin?token=${token}`
  
  const emailOptions: QRCodeOptions = {
    width: 150,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111111',
      light: '#FFFFFF'
    },
    ...options
  }

  try {
    const dataUrl = await QRCode.toDataURL(checkinUrl, emailOptions)
    const base64Data = dataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    return {
      dataUrl,
      buffer
    }
  } catch (error) {
    console.error('Email QR code generation error:', error)
    throw new Error('Failed to generate email QR code')
  }
}

/**
 * Get existing QR code public URL if it exists
 */
export async function getQRCodeUrl(token: string): Promise<string | null> {
  try {
    const supabase = await supabaseServer()
    const fileName = `qr-codes/invitation-${token}.png`
    
    const { data: publicUrlData } = supabase.storage
      .from('bdiamond')
      .getPublicUrl(fileName)
    
    // Check if file exists by trying to get its metadata
    const { error } = await supabase.storage
      .from('bdiamond')
      .getPublicUrl(fileName)
    
    if (error) {
      return null
    }
    
    return publicUrlData.publicUrl
  } catch (error) {
    console.error('Error getting QR code URL:', error)
    return null
  }
}
