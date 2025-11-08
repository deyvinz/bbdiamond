import { supabaseService } from './supabase-service'
import { getWeddingTheme } from './theme-service'
import { cacheJson, invalidateKeys } from './cache'

export interface EmailConfig {
  weddingId: string
  fromName: string
  fromEmail: string
  replyToEmail: string
  invitationSubjectTemplate: string
  rsvpConfirmationSubjectTemplate: string
  customFooterText?: string | null
  verifiedDomain?: string | null
  resendDomainId?: string | null
  logoUrl?: string | null
  primaryColor?: string | null
  footerHtml?: string | null
}

export interface EmailBranding {
  logoUrl?: string | null
  primaryColor: string
  coupleDisplayName: string
  websiteUrl: string
  contactEmail: string
  replyToEmail: string
}

export interface EmailConfigData {
  config: EmailConfig
  branding: EmailBranding
  websiteUrl: string
}

/**
 * Get complete email configuration for a wedding
 * Fetches email config, theme, and wedding data
 * 
 * CACHED: This function uses Redis/Upstash caching with 5-minute TTL.
 * Cache key: `email-config:${weddingId}`
 * 
 * This caching applies site-wide to all uses:
 * - RSVP confirmation emails (lib/rsvp-service.ts)
 * - Invitation emails (lib/invitations-service.ts)
 * - Contact form emails (app/api/contact/route.ts)
 * - Admin email config page (app/admin/email/page.tsx)
 * - Any other component using email service
 * 
 * Note: Edge functions (Deno) use direct DB queries and cannot use this cache.
 * Cache is automatically invalidated when email config is updated via invalidateEmailConfigCache().
 */
export async function getEmailConfig(weddingId: string): Promise<EmailConfigData | null> {
  const cacheKey = `email-config:${weddingId}`
  const TTL_SECONDS = 300 // 5 minutes
  
  return cacheJson<EmailConfigData | null>(
    cacheKey,
    TTL_SECONDS,
    async () => {
      try {
        const supabase = supabaseService()

        // Fetch email config
        const { data: emailConfig, error: emailConfigError } = await supabase
          .from('wedding_email_config')
          .select('*')
          .eq('wedding_id', weddingId)
          .single()

        // Fetch wedding data
        const { data: wedding, error: weddingError } = await supabase
          .from('weddings')
          .select('couple_display_name, contact_email, custom_domain, subdomain')
          .eq('id', weddingId)
          .single()

        // Fetch theme for branding
        const theme = await getWeddingTheme(weddingId)

        if (weddingError || !wedding) {
          console.error('Error fetching wedding for email config:', weddingError)
          return null
        }

        // Build email config with fallbacks
        const config: EmailConfig = {
          weddingId,
          fromName: emailConfig?.from_name || wedding.couple_display_name || 'Wedding',
          fromEmail: emailConfig?.from_email || wedding.contact_email || 'noreply@luwani.com',
          replyToEmail: emailConfig?.reply_to_email || wedding.contact_email || 'noreply@luwani.com',
          invitationSubjectTemplate: emailConfig?.invitation_subject_template || "You're Invited, {guest_name} — {event_name}",
          rsvpConfirmationSubjectTemplate: emailConfig?.rsvp_confirmation_subject_template || 'RSVP Confirmation — {event_name}',
          customFooterText: emailConfig?.custom_footer_text || null,
          verifiedDomain: emailConfig?.verified_domain || null,
          resendDomainId: emailConfig?.resend_domain_id || null,
          logoUrl: emailConfig?.logo_url || null,
          primaryColor: emailConfig?.primary_color || null,
          footerHtml: emailConfig?.footer_html || null,
        }

        // Build branding with fallbacks
        const branding: EmailBranding = {
          logoUrl: config.logoUrl || theme?.email_logo_url || theme?.logo_url || null,
          primaryColor: config.primaryColor || theme?.primary_color || '#C7A049',
          coupleDisplayName: wedding.couple_display_name || 'Wedding Celebration',
          websiteUrl: await getWebsiteUrl(weddingId, wedding.custom_domain, wedding.subdomain),
          contactEmail: wedding.contact_email || 'contact@luwani.com',
          replyToEmail: config.replyToEmail,
        }

        return {
          config,
          branding,
          websiteUrl: branding.websiteUrl,
        }
      } catch (error) {
        console.error('Error in getEmailConfig:', error)
        return null
      }
    }
  )
}

/**
 * Get formatted "from" address for Resend API
 * Format: "Name" <email@domain.com>
 * 
 * CACHED: Uses getEmailConfig() which is cached (5-minute TTL)
 * This function benefits from caching automatically.
 */
export async function getFromAddress(weddingId: string): Promise<string> {
  const emailConfigData = await getEmailConfig(weddingId)
  
  if (!emailConfigData) {
    // Fallback to default
    const defaultDomain = getDefaultDomain()
    return `"Wedding" <noreply@${defaultDomain}>`
  }

  const { config } = emailConfigData
  const domain = extractDomainFromEmail(config.fromEmail) || getDefaultDomain()
  const email = config.fromEmail.includes('@') 
    ? config.fromEmail 
    : `noreply@${domain}`

  return `"${config.fromName}" <${email}>`
}

/**
 * Get reply-to email address
 * 
 * CACHED: Uses getEmailConfig() which is cached (5-minute TTL)
 * This function benefits from caching automatically.
 */
export async function getReplyToAddress(weddingId: string): Promise<string> {
  const emailConfigData = await getEmailConfig(weddingId)
  
  if (!emailConfigData) {
    const defaultDomain = getDefaultDomain()
    return `noreply@${defaultDomain}`
  }

  return emailConfigData.config.replyToEmail
}

/**
 * Get email branding (logo, colors, couple name, etc.)
 * 
 * CACHED: Uses getEmailConfig() which is cached (5-minute TTL)
 * This function benefits from caching automatically.
 */
export async function getEmailBranding(weddingId: string): Promise<EmailBranding | null> {
  const emailConfigData = await getEmailConfig(weddingId)
  return emailConfigData?.branding || null
}

/**
 * Get website URL for a wedding
 * Priority: custom domain > subdomain > default domain
 */
export async function getWebsiteUrl(weddingId: string): Promise<string>
export async function getWebsiteUrl(weddingId: string, customDomain?: string | null, subdomain?: string | null): Promise<string>
export async function getWebsiteUrl(
  weddingId: string,
  customDomain?: string | null,
  subdomain?: string | null
): Promise<string> {
  // If custom domain and subdomain provided, use them directly
  if (customDomain !== undefined || subdomain !== undefined) {
    if (customDomain) {
      return `https://${customDomain}`
    }
    if (subdomain) {
      const baseDomain = getBaseDomain()
      return `https://${subdomain}.${baseDomain}`
    }
  }

  // Otherwise fetch from database
  try {
    const supabase = supabaseService()
    const { data: wedding, error } = await supabase
      .from('weddings')
      .select('custom_domain, subdomain')
      .eq('id', weddingId)
      .single()

    if (error || !wedding) {
      return getDefaultWebsiteUrl()
    }

    // Priority: custom domain > subdomain > default
    if (wedding.custom_domain) {
      return `https://${wedding.custom_domain}`
    }
    if (wedding.subdomain) {
      const baseDomain = getBaseDomain()
      return `https://${wedding.subdomain}.${baseDomain}`
    }

    return getDefaultWebsiteUrl()
  } catch (error) {
    console.error('Error fetching website URL:', error)
    return getDefaultWebsiteUrl()
  }
}

/**
 * Get default domain from environment or fallback
 */
function getDefaultDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      const url = new URL(appUrl)
      return url.hostname.replace('www.', '')
    } catch {
      // Invalid URL, continue to fallback
    }
  }
  return 'luwani.com'
}

/**
 * Get base domain for subdomains
 */
function getBaseDomain(): string {
  return getDefaultDomain()
}

/**
 * Get default website URL
 */
function getDefaultWebsiteUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    return appUrl.replace(/\/$/, '') // Remove trailing slash
  }
  return 'https://luwani.com'
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email: string): string | null {
  const match = email.match(/@(.+)$/)
  return match ? match[1] : null
}

/**
 * Format subject template with variables
 */
export function formatSubjectTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let subject = template
  for (const [key, value] of Object.entries(variables)) {
    subject = subject.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  }
  return subject
}

/**
 * Invalidate email config cache for a specific wedding
 * Call this after updating wedding_email_config to ensure fresh data is fetched
 * 
 * @param weddingId - The wedding ID to invalidate cache for
 */
export async function invalidateEmailConfigCache(weddingId: string): Promise<void> {
  const cacheKey = `email-config:${weddingId}`
  await invalidateKeys(cacheKey)
}

