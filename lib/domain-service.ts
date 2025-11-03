import { supabaseService } from './supabase-service'

export interface DomainInfo {
  domain: string
  weddingId: string
  isPrimary: boolean
  isVerified: boolean
}

/**
 * Resolve wedding ID from domain
 * Supports custom domains and subdomains
 */
export async function resolveWeddingFromDomain(hostname: string): Promise<string | null> {
  try {
    const supabase = supabaseService()

    // Remove port if present
    const domain = hostname.split(':')[0]

    // First, check for custom domain match
    const { data: customDomain, error: customError } = await supabase
      .from('wedding_domains')
      .select('wedding_id')
      .eq('domain', domain)
      .eq('is_verified', true)
      .single()

    if (!customError && customDomain?.wedding_id) {
      return customDomain.wedding_id
    }

    // Check for subdomain match
    const subdomain = extractSubdomain(domain)
    if (subdomain) {
      const { data: wedding, error: subdomainError } = await supabase
        .from('weddings')
        .select('id')
        .eq('subdomain', subdomain)
        .eq('status', 'active')
        .single()

      if (!subdomainError && wedding?.id) {
        return wedding.id
      }
    }

    return null
  } catch (error) {
    console.error('Error resolving wedding from domain:', error)
    return null
  }
}

/**
 * Extract subdomain from hostname
 * Supports:
 * - Production: "couple.weddingplatform.com" -> "couple"
 * - Localhost: "couple.localhost" -> "couple"
 * - lvh.me: "couple.lvh.me" -> "couple" (better cross-browser support)
 * - Hosts file: "couple.weddingplatform.com" (mapped to 127.0.0.1) -> "couple"
 */
function extractSubdomain(hostname: string): string | null {
  const IS_DEVELOPMENT = process.env.NODE_ENV === 'development'
  const ENABLE_LOCALHOST_TESTING = process.env.ENABLE_LOCALHOST_TESTING !== 'false'
  
  // Remove port if present
  const domain = hostname.split(':')[0]

  // Check for localhost patterns (development only)
  if (IS_DEVELOPMENT || ENABLE_LOCALHOST_TESTING) {
    // Support subdomain.localhost pattern (e.g., "john-sarah.localhost:3000")
    if (domain.endsWith('.localhost')) {
      const parts = domain.split('.')
      if (parts.length >= 2 && parts[parts.length - 1] === 'localhost') {
        return parts[0]
      }
    }

    // Support subdomain.lvh.me pattern (lvh.me resolves to 127.0.0.1)
    // Better cross-browser support than .localhost
    if (domain.endsWith('.lvh.me')) {
      const parts = domain.split('.')
      if (parts.length >= 3 && parts[parts.length - 2] === 'lvh' && parts[parts.length - 1] === 'me') {
        return parts[0]
      }
    }

    // For hosts file mappings, we can still extract subdomain normally
    // if it's a valid domain pattern (3+ parts)
    // This allows testing with "couple.weddingplatform.com" mapped to 127.0.0.1
    const parts = domain.split('.')
    if (parts.length >= 3 && domain !== 'localhost') {
      return parts[0]
    }
  }

  // Production: Don't extract subdomain for bare localhost or IP addresses
  if (domain === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
    return null
  }

  // Production: Extract subdomain for standard domain patterns
  const parts = domain.split('.')
  // If we have 3+ parts, the first is the subdomain
  // e.g., "couple.weddingplatform.com" -> ["couple", "weddingplatform", "com"]
  if (parts.length >= 3) {
    return parts[0]
  }

  return null
}

/**
 * Get all domains for a wedding
 */
export async function getWeddingDomains(weddingId: string): Promise<DomainInfo[]> {
  try {
    const supabase = supabaseService()
    const { data: domains, error } = await supabase
      .from('wedding_domains')
      .select('domain, wedding_id, is_primary, is_verified')
      .eq('wedding_id', weddingId)
      .order('is_primary', { ascending: false })

    if (error) {
      console.error('Error fetching wedding domains:', error)
      return []
    }

    return (domains || []).map((d) => ({
      domain: d.domain,
      weddingId: d.wedding_id,
      isPrimary: d.is_primary,
      isVerified: d.is_verified,
    }))
  } catch (error) {
    console.error('Error in getWeddingDomains:', error)
    return []
  }
}

/**
 * Add a domain to a wedding
 */
export async function addWeddingDomain(
  weddingId: string,
  domain: string,
  isPrimary: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseService()

    // Generate verification token
    const verificationToken = generateVerificationToken()

    // If this is set as primary, unset other primary domains
    if (isPrimary) {
      await supabase
        .from('wedding_domains')
        .update({ is_primary: false })
        .eq('wedding_id', weddingId)
        .eq('is_primary', true)
    }

    const { error } = await supabase.from('wedding_domains').insert({
      wedding_id: weddingId,
      domain,
      is_primary: isPrimary,
      is_verified: false, // Requires manual verification or DNS check
      verification_token: verificationToken,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Verify domain ownership
 * In a real implementation, this would check DNS records
 */
export async function verifyDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseService()

    // In production, this would check DNS TXT records
    // For now, we'll just mark it as verified
    const { error } = await supabase
      .from('wedding_domains')
      .update({ is_verified: true })
      .eq('id', domainId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Remove a domain from a wedding
 */
export async function removeWeddingDomain(domainId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = supabaseService()
    const { error } = await supabase.from('wedding_domains').delete().eq('id', domainId)

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Generate a verification token for domain ownership
 */
function generateVerificationToken(): string {
  return `wedding-verify-${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`
}

