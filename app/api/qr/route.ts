import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const eventId = searchParams.get('eventId')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    // Build RSVP URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://brendabagsherdiamond.com'
    const rsvpUrl = eventId 
      ? `${baseUrl}/rsvp?token=${token}&eventId=${eventId}`
      : `${baseUrl}/rsvp?token=${token}`

    // Generate QR code as PNG
    const qrCodeDataUrl = await QRCode.toDataURL(rsvpUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#111111',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })

    // Convert data URL to buffer
    const base64Data = qrCodeDataUrl.split(',')[1]
    const buffer = Buffer.from(base64Data, 'base64')

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('QR code generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate QR code' },
      { status: 500 }
    )
  }
}
