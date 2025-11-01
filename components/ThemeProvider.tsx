'use client'

import { useEffect } from 'react'
import type { WeddingTheme } from '@/lib/types/theme'
import { getThemeCSSVars, getThemeFonts, getGoogleFontsURL } from '@/lib/theme-service'

interface ThemeProviderProps {
  theme: WeddingTheme
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    // Inject CSS variables into document root
    const cssVars = getThemeCSSVars(theme)
    const root = document.documentElement

    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Load Google Fonts
    const fonts = getThemeFonts(theme)
    const fontsURL = getGoogleFontsURL(theme)

    // Check if font link already exists
    let fontLink = document.getElementById('wedding-theme-fonts') as HTMLLinkElement
    if (!fontLink) {
      fontLink = document.createElement('link')
      fontLink.id = 'wedding-theme-fonts'
      fontLink.rel = 'stylesheet'
      document.head.appendChild(fontLink)
    }
    fontLink.href = fontsURL

    // Set font family CSS variables
    root.style.setProperty('--font-primary', fonts.primary)
    root.style.setProperty('--font-secondary', fonts.secondary)
    root.style.setProperty('--font-family-sans', `var(--font-primary), sans-serif`)
    root.style.setProperty('--font-family-serif', `var(--font-secondary), serif`)

    // Cleanup function
    return () => {
      // Optionally remove fonts on unmount (usually not needed)
      // fontLink?.remove()
    }
  }, [theme])

  // Also inject theme as data attribute for CSS selectors if needed
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-wedding-id', theme.wedding_id)
  }, [theme.wedding_id])

  return <>{children}</>
}

/**
 * Server component wrapper that fetches theme and provides it
 */
export async function ThemeProviderServer({
  weddingId,
  children,
}: {
  weddingId: string
  children: React.ReactNode
}) {
  const { getWeddingTheme } = await import('@/lib/theme-service')
  const { getDefaultTheme } = await import('@/lib/theme-service')
  
  const theme = await getWeddingTheme(weddingId) || getDefaultTheme()

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>
}

