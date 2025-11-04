/**
 * Analytics utility for tracking user events and conversions
 * Supports Google Analytics 4 (GA4) and custom event tracking
 */

declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string | Date,
      config?: Record<string, any>
    ) => void
    dataLayer?: any[]
  }
}

/**
 * Track a page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '', {
      page_path: path,
      page_title: title,
    })
  }

  // Custom event tracking (can be sent to your analytics endpoint)
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'page_view',
        path,
        title,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => console.error('Analytics error:', error))
  }
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (typeof window === 'undefined') return

  // Google Analytics 4
  if (window.gtag) {
    window.gtag('event', eventName, {
      ...eventParams,
      timestamp: new Date().toISOString(),
    })
  }

  // Custom event tracking
  if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
    fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: eventName,
        params: eventParams,
        timestamp: new Date().toISOString(),
      }),
    }).catch((error) => console.error('Analytics error:', error))
  }
}

/**
 * Track conversion events
 */
export const trackConversion = {
  signupStarted: () => trackEvent('signup_started'),
  signupCompleted: (plan?: string) =>
    trackEvent('signup_completed', { plan }),
  trialStarted: (plan?: string) => trackEvent('trial_started', { plan }),
  pricingViewed: (plan?: string) => trackEvent('pricing_viewed', { plan }),
  templateViewed: (templateName?: string) =>
    trackEvent('template_viewed', { template_name: templateName }),
  templateSelected: (templateName?: string) =>
    trackEvent('template_selected', { template_name: templateName }),
  onboardingStarted: () => trackEvent('onboarding_started'),
  onboardingStepCompleted: (step: string, stepNumber: number) =>
    trackEvent('onboarding_step_completed', { step, step_number: stepNumber }),
  onboardingCompleted: () => trackEvent('onboarding_completed'),
  onboardingAbandoned: (step: string, stepNumber: number) =>
    trackEvent('onboarding_abandoned', { step, step_number: stepNumber }),
  contactFormSubmitted: () => trackEvent('contact_form_submitted'),
  demoViewed: () => trackEvent('demo_viewed'),
  featurePageViewed: () => trackEvent('feature_page_viewed'),
}

/**
 * Initialize Google Analytics
 */
export function initializeGA() {
  if (typeof window === 'undefined') return
  if (window.gtag) return // Already initialized

  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
  if (!measurementId) {
    console.warn('Google Analytics measurement ID not configured')
    return
  }

  // Load gtag script
  const script1 = document.createElement('script')
  script1.async = true
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`
  document.head.appendChild(script1)

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || []
  window.gtag = function () {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', measurementId, {
    send_page_view: false, // We'll handle page views manually
  })
}

