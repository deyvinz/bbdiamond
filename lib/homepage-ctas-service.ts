import { supabaseServer } from './supabase-server'
import { getWeddingId } from './wedding-context-server'
import { bumpNamespaceVersion, cacheJson } from './cache'

export interface HomepageCTA {
  id: string
  wedding_id: string
  label: string
  href: string
  variant: 'primary' | 'bordered'
  is_visible: boolean
  display_order: number
  created_at: string
  updated_at: string
}

export interface CreateCTAInput {
  label: string
  href: string
  variant?: 'primary' | 'bordered'
  is_visible?: boolean
  display_order?: number
}

export interface UpdateCTAInput {
  label?: string
  href?: string
  variant?: 'primary' | 'bordered'
  is_visible?: boolean
  display_order?: number
}

export async function getHomepageCTAs(weddingId?: string): Promise<HomepageCTA[]> {
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    return []
  }

  const supabase = await supabaseServer()

  const { data: ctas, error } = await supabase
    .from('homepage_ctas')
    .select('*')
    .eq('wedding_id', resolvedWeddingId)
    .eq('is_visible', true)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching homepage CTAs:', error)
    return []
  }

  return ctas || []
}

export async function getAllHomepageCTAs(weddingId?: string): Promise<HomepageCTA[]> {
  const resolvedWeddingId = weddingId || await getWeddingId()
  if (!resolvedWeddingId) {
    return []
  }

  const supabase = await supabaseServer()

  const { data: ctas, error } = await supabase
    .from('homepage_ctas')
    .select('*')
    .eq('wedding_id', resolvedWeddingId)
    .order('display_order', { ascending: true })

  if (error) {
    console.error('Error fetching all homepage CTAs:', error)
    return []
  }

  return ctas || []
}

export async function createCTA(ctaData: CreateCTAInput, weddingId?: string): Promise<HomepageCTA> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to create CTAs')
  }

  // Get max display_order if not provided
  let order = ctaData.display_order
  if (order === undefined || order === null) {
    const { data: existing } = await supabase
      .from('homepage_ctas')
      .select('display_order')
      .eq('wedding_id', resolvedWeddingId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    order = existing?.display_order !== undefined ? (existing.display_order + 1) : 0
  }

  const { data: cta, error } = await supabase
    .from('homepage_ctas')
    .insert({
      wedding_id: resolvedWeddingId,
      label: ctaData.label.trim(),
      href: ctaData.href.trim(),
      variant: ctaData.variant || 'bordered',
      is_visible: ctaData.is_visible !== undefined ? ctaData.is_visible : true,
      display_order: order,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating CTA:', error)
    throw new Error(`Failed to create CTA: ${error.message}`)
  }

  await bumpNamespaceVersion()
  return cta
}

export async function updateCTA(
  ctaId: string,
  ctaData: UpdateCTAInput,
  weddingId?: string
): Promise<HomepageCTA> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to update CTAs')
  }

  const updateData: any = {}
  if (ctaData.label !== undefined) updateData.label = ctaData.label.trim()
  if (ctaData.href !== undefined) updateData.href = ctaData.href.trim()
  if (ctaData.variant !== undefined) updateData.variant = ctaData.variant
  if (ctaData.is_visible !== undefined) updateData.is_visible = ctaData.is_visible
  if (ctaData.display_order !== undefined) updateData.display_order = ctaData.display_order

  const { data: cta, error } = await supabase
    .from('homepage_ctas')
    .update(updateData)
    .eq('id', ctaId)
    .eq('wedding_id', resolvedWeddingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating CTA:', error)
    throw new Error(`Failed to update CTA: ${error.message}`)
  }

  if (!cta) {
    throw new Error('CTA not found')
  }

  await bumpNamespaceVersion()
  return cta
}

export async function deleteCTA(ctaId: string, weddingId?: string): Promise<void> {
  const supabase = await supabaseServer()
  const resolvedWeddingId = weddingId || await getWeddingId()

  if (!resolvedWeddingId) {
    throw new Error('Wedding ID is required to delete CTAs')
  }

  const { error } = await supabase
    .from('homepage_ctas')
    .delete()
    .eq('id', ctaId)
    .eq('wedding_id', resolvedWeddingId)

  if (error) {
    console.error('Error deleting CTA:', error)
    throw new Error(`Failed to delete CTA: ${error.message}`)
  }

  await bumpNamespaceVersion()
}

