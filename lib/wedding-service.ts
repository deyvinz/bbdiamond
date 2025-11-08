import { supabaseService } from './supabase-service'
import type { Wedding, WeddingCreate, WeddingUpdate } from './types/wedding'

/**
 * Get wedding by ID
 */
export async function getWeddingById(weddingId: string): Promise<Wedding | null> {
  try {
    const supabase = supabaseService()
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('id', weddingId)
      .single()

    if (error) {
      console.error('Error fetching wedding:', error)
      return null
    }

    return data as Wedding
  } catch (error) {
    console.error('Error in getWeddingById:', error)
    return null
  }
}

/**
 * Get wedding by slug
 */
export async function getWeddingBySlug(slug: string): Promise<Wedding | null> {
  try {
    const supabase = supabaseService()
    const { data, error } = await supabase
      .from('weddings')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (error) {
      console.error('Error fetching wedding by slug:', error)
      return null
    }

    return data as Wedding
  } catch (error) {
    console.error('Error in getWeddingBySlug:', error)
    return null
  }
}

/**
 * Create a new wedding
 */
export async function createWedding(
  wedding: WeddingCreate,
  ownerId?: string
): Promise<{ success: boolean; wedding?: Wedding; error?: string }> {
  try {
    const supabase = supabaseService()

    // Check if slug already exists
    const { data: existing } = await supabase
      .from('weddings')
      .select('id')
      .eq('slug', wedding.slug)
      .single()

    if (existing) {
      return { success: false, error: 'A wedding with this slug already exists' }
    }

    // Check if subdomain already exists (if provided)
    if (wedding.subdomain) {
      const { data: existingSubdomain } = await supabase
        .from('weddings')
        .select('id')
        .eq('subdomain', wedding.subdomain)
        .single()

      if (existingSubdomain) {
        return { success: false, error: 'A wedding with this subdomain already exists' }
      }
    }

    const { data, error } = await supabase
      .from('weddings')
      .insert({
        ...wedding,
        owner_id: ownerId || null,
        secondary_dates: wedding.secondary_dates || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating wedding:', error)
      return { success: false, error: error.message }
    }

    // Create default theme for the wedding
    await createDefaultTheme(data.id)

    // Create default email config
    await createDefaultEmailConfig(data.id, wedding.contact_email)

    // Create default wedding config
    await createDefaultWeddingConfig(data.id)

    return { success: true, wedding: data as Wedding }
  } catch (error) {
    console.error('Error in createWedding:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Update wedding
 */
export async function updateWedding(
  weddingId: string,
  updates: WeddingUpdate
): Promise<{ success: boolean; wedding?: Wedding; error?: string }> {
  try {
    const supabase = supabaseService()

    // If slug is being updated, check for conflicts
    if (updates.slug) {
      const { data: existing } = await supabase
        .from('weddings')
        .select('id')
        .eq('slug', updates.slug)
        .neq('id', weddingId)
        .single()

      if (existing) {
        return { success: false, error: 'A wedding with this slug already exists' }
      }
    }

    // If subdomain is being updated, check for conflicts
    if (updates.subdomain) {
      const { data: existingSubdomain } = await supabase
        .from('weddings')
        .select('id')
        .eq('subdomain', updates.subdomain)
        .neq('id', weddingId)
        .single()

      if (existingSubdomain) {
        return { success: false, error: 'A wedding with this subdomain already exists' }
      }
    }

    const { data, error } = await supabase
      .from('weddings')
      .update({
        ...updates,
        secondary_dates: updates.secondary_dates || undefined,
        updated_at: new Date().toISOString(),
      })
      .eq('id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wedding:', error)
      return { success: false, error: error.message }
    }

    return { success: true, wedding: data as Wedding }
  } catch (error) {
    console.error('Error in updateWedding:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete wedding (soft delete by setting status to archived)
 */
export async function deleteWedding(weddingId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseService()
    const { error } = await supabase
      .from('weddings')
      .update({ status: 'archived', updated_at: new Date().toISOString() })
      .eq('id', weddingId)

    if (error) {
      console.error('Error deleting wedding:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in deleteWedding:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Create default theme for a wedding
 */
async function createDefaultTheme(weddingId: string): Promise<void> {
  try {
    const supabase = supabaseService()
    await supabase.from('wedding_themes').insert({
      wedding_id: weddingId,
      // Default gold theme
      primary_color: '#CDA349',
      secondary_color: '#B38D39',
      accent_color: '#E1B858',
      gold_50: '#FFF8E6',
      gold_100: '#FDECC8',
      gold_200: '#F7DC9F',
      gold_300: '#EEC874',
      gold_400: '#E1B858',
      gold_500: '#CDA349',
      gold_600: '#B38D39',
      gold_700: '#8C6E2C',
      gold_800: '#6B531F',
      gold_900: '#4A3915',
      primary_font: 'Inter',
      secondary_font: 'Playfair Display',
      primary_font_weights: ['400', '500', '600'],
      secondary_font_weights: ['400', '600', '700'],
    })
  } catch (error) {
    console.error('Error creating default theme:', error)
  }
}

/**
 * Create default email config for a wedding
 */
async function createDefaultEmailConfig(weddingId: string, contactEmail: string): Promise<void> {
  try {
    const supabase = supabaseService()
    
    // Fetch wedding to get couple_display_name
    const { data: wedding } = await supabase
      .from('weddings')
      .select('couple_display_name')
      .eq('id', weddingId)
      .single()
    
    const fromName = wedding?.couple_display_name || 'Wedding'
    
    await supabase.from('wedding_email_config').insert({
      wedding_id: weddingId,
      from_name: fromName,
      from_email: contactEmail,
      reply_to_email: contactEmail,
      invitation_subject_template: "You're Invited, {guest_name} — {event_name}",
      rsvp_confirmation_subject_template: 'RSVP Confirmation — {event_name}',
    })
  } catch (error) {
    console.error('Error creating default email config:', error)
  }
}

/**
 * Create default wedding config
 */
async function createDefaultWeddingConfig(weddingId: string): Promise<void> {
  try {
    const supabase = supabaseService()
    const defaultConfigs = [
      { key: 'plus_ones_enabled', value: 'false', description: 'Enable or disable plus-one functionality' },
      { key: 'max_party_size', value: '1', description: 'Maximum number of people allowed per invitation' },
      { key: 'allow_guest_plus_ones', value: 'false', description: 'Allow guests to specify plus-ones when RSVPing' },
      { key: 'rsvp_enabled', value: 'true', description: 'Enable or disable RSVP functionality' },
      { key: 'rsvp_cutoff_timezone', value: 'America/New_York', description: 'Timezone for RSVP cutoff date' },
    ]

    for (const config of defaultConfigs) {
      await supabase.from('wedding_config').insert({
        wedding_id: weddingId,
        ...config,
      })
    }
  } catch (error) {
    console.error('Error creating default wedding config:', error)
  }
}

