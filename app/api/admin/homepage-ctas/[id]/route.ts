import { NextRequest, NextResponse } from 'next/server'
import { requireWeddingId } from '@/lib/api-wedding-context'
import {
  updateCTA,
  deleteCTA,
  type UpdateCTAInput,
} from '@/lib/homepage-ctas-service'

// PUT - Update CTA
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params
    const body = await request.json()
    const { label, href, variant, is_visible, display_order } = body

    const updateData: UpdateCTAInput = {}
    if (label !== undefined) updateData.label = label
    if (href !== undefined) updateData.href = href
    if (variant !== undefined) updateData.variant = variant
    if (is_visible !== undefined) updateData.is_visible = is_visible
    if (display_order !== undefined) updateData.display_order = display_order

    const cta = await updateCTA(id, updateData, weddingId)

    return NextResponse.json({
      success: true,
      cta,
    })
  } catch (error) {
    console.error('Error in homepage CTAs PUT:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'CTA not found' },
        { status: 404 }
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

// DELETE - Delete CTA
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const weddingId = await requireWeddingId(request)
    const { id } = await params

    await deleteCTA(id, weddingId)

    return NextResponse.json({
      success: true,
      message: 'CTA deleted successfully',
    })
  } catch (error) {
    console.error('Error in homepage CTAs DELETE:', error)
    if (error instanceof Error && error.message.includes('not found')) {
      return NextResponse.json(
        { success: false, error: 'CTA not found' },
        { status: 404 }
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

