import type { ConfigValue } from '@/lib/types/config'

/**
 * Check if RSVP is currently allowed based on configuration
 */
export function isRsvpAllowed(config: ConfigValue): {
  allowed: boolean
  reason?: string
} {
  // Check if RSVP is globally disabled
  if (!config.rsvp_enabled) {
    return {
      allowed: false,
      reason: 'RSVP is currently disabled by the administrators.',
    }
  }

  // Check if there's a cutoff date
  if (!config.rsvp_cutoff_date) {
    return { allowed: true }
  }

  // Check if cutoff date has passed
  const now = new Date()
  const cutoffDate = new Date(config.rsvp_cutoff_date)

  if (now > cutoffDate) {
    return {
      allowed: false,
      reason: `RSVP deadline has passed. The cutoff was ${cutoffDate.toLocaleString('en-US', {
        timeZone: config.rsvp_cutoff_timezone || 'America/New_York',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      })}.`,
    }
  }

  return { allowed: true }
}

/**
 * Get formatted cutoff date string
 */
export function getFormattedCutoffDate(config: ConfigValue): string | null {
  if (!config.rsvp_cutoff_date) {
    return null
  }

  const cutoffDate = new Date(config.rsvp_cutoff_date)
  return cutoffDate.toLocaleString('en-US', {
    timeZone: config.rsvp_cutoff_timezone || 'America/New_York',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })
}

/**
 * Get time remaining until RSVP cutoff
 */
export function getTimeUntilCutoff(config: ConfigValue): {
  hasDeadline: boolean
  isPast: boolean
  daysRemaining?: number
  hoursRemaining?: number
  formattedTime?: string
} {
  if (!config.rsvp_cutoff_date) {
    return { hasDeadline: false, isPast: false }
  }

  const now = new Date()
  const cutoffDate = new Date(config.rsvp_cutoff_date)
  const diffMs = cutoffDate.getTime() - now.getTime()

  if (diffMs < 0) {
    return { hasDeadline: true, isPast: true }
  }

  const daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  let formattedTime = ''
  if (daysRemaining > 0) {
    formattedTime = `${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}`
    if (hoursRemaining > 0) {
      formattedTime += ` and ${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`
    }
  } else if (hoursRemaining > 0) {
    formattedTime = `${hoursRemaining} hour${hoursRemaining !== 1 ? 's' : ''}`
  } else {
    const minutesRemaining = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    formattedTime = `${minutesRemaining} minute${minutesRemaining !== 1 ? 's' : ''}`
  }

  return {
    hasDeadline: true,
    isPast: false,
    daysRemaining,
    hoursRemaining,
    formattedTime,
  }
}

