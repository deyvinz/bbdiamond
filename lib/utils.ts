import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize a domain by removing the 'www.' prefix if present
 * This ensures both 'boandjane.com' and 'www.boandjane.com' are treated as the same domain
 * @param domain - The domain to normalize
 * @returns The normalized domain without 'www.' prefix
 */
export function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, '')
}

/**
 * Check if a domain is the main platform domain (luwani.com)
 * Supports both 'luwani.com' and 'www.luwani.com'
 * @param domain - The domain to check
 * @returns true if the domain is luwani.com (with or without www)
 */
export function isMainDomain(domain: string): boolean {
  const normalized = normalizeDomain(domain)
  const mainDomain = getMainDomain()
  return normalized === mainDomain
}

/**
 * Get the main platform domain from environment or default
 * @returns The main domain (e.g., 'luwani.com')
 */
function getMainDomain(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (appUrl) {
    try {
      const url = new URL(appUrl)
      return normalizeDomain(url.hostname)
    } catch {
      // Invalid URL, continue to fallback
    }
  }
  return 'luwani.com'
}
