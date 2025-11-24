import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  getAllHomepageCTAs,
  createCTA,
  type CreateCTAInput,
} from '@/lib/homepage-ctas-service'

// GET - List all CTAs (including hidden ones for admin)
export async function GET(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const ctas = await getAllHomepageCTAs(weddingId)

    return NextResponse.json({
      success: true,
      ctas,
    })
  } catch (error) {
    console.error('Error in homepage CTAs GET:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Create new CTA
export async function POST(request: NextRequest) {
  try {
    const weddingId = await requireWeddingId(request)
    const body = await request.json()
    const { label, href, variant, is_visible, display_order } = body

    if (!label || !label.trim()) {
      return NextResponse.json(
        { success: false, error: 'CTA label is required' },
        { status: 400 }
      )
    }

    if (!href || !href.trim()) {
      return NextResponse.json(
        { success: false, error: 'CTA href is required' },
        { status: 400 }
      )
    }

    const ctaData: CreateCTAInput = {
      label: label.trim(),
      href: href.trim(),
      variant: variant || 'bordered',
      is_visible: is_visible !== undefined ? is_visible : true,
      display_order,
    }

    const cta = await createCTA(ctaData, weddingId)

    return NextResponse.json({
      success: true,
      cta,
    }, { status: 201 })
  } catch (error) {
    console.error('Error in homepage CTAs POST:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}

