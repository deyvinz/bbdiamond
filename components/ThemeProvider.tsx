'use client'

import { useEffect } from 'react'
import type { WeddingTheme } from '@/lib/types/theme'
import { getThemeCSSVars, getHeroUIThemeCSS, getThemeFonts, getGoogleFontsURL } from '@/lib/theme-service'

interface ThemeProviderProps {
  theme: WeddingTheme
  children: React.ReactNode
}

export function ThemeProvider({ theme, children }: ThemeProviderProps) {
  useEffect(() => {
    // Inject CSS variables into document root
    const cssVars = getThemeCSSVars(theme)
    const root = document.documentElement

    // Inject standard theme CSS variables
    Object.entries(cssVars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Apply background color to body
    if (theme.background_color) {
      document.body.style.backgroundColor = theme.background_color
    }

    // Apply background pattern if set
    if (theme.background_pattern) {
      root.style.setProperty('--background-pattern', `url(${theme.background_pattern})`)
      // Also set as inline style on body for better browser support
      document.body.style.backgroundImage = `url(${theme.background_pattern})`
      document.body.style.backgroundRepeat = 'repeat'
      document.body.style.backgroundSize = 'auto'
      document.body.style.backgroundAttachment = 'fixed'
    } else {
      document.body.style.backgroundImage = 'none'
    }

    // Inject HeroUI theme CSS as a style tag
    // Remove existing HeroUI theme style if present
    let heroUIStyle = document.getElementById('wedding-heroui-theme') as HTMLStyleElement
    if (!heroUIStyle) {
      heroUIStyle = document.createElement('style')
      heroUIStyle.id = 'wedding-heroui-theme'
      document.head.appendChild(heroUIStyle)
    }
    heroUIStyle.textContent = getHeroUIThemeCSS(theme)

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

  // Update hardcoded colors dynamically for Tailwind arbitrary values
  // This is a fallback for elements that use hardcoded hex colors in classes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const primary = theme.primary_color || theme.gold_500
    const hoverColor = theme.gold_600 || primary
    
    // Default gold colors that should be replaced
    const defaultColors = ['#C8A951', '#CDA349', '#B38D39', '#E1B858', '#C7A049']
    const rgbColors = ['rgb(200, 169, 81)', 'rgb(205, 163, 73)', 'rgb(179, 141, 57)', 'rgb(225, 184, 88)']
    
    const updateElementColors = () => {
      // Fix bordered buttons - ensure transparent background and visible text
      const borderedButtons = document.querySelectorAll('button[class*="variant-bordered"], button[data-slot="base"][class*="border-primary"]')
      borderedButtons.forEach((btn) => {
        const htmlBtn = btn as HTMLElement
        const computedStyle = window.getComputedStyle(htmlBtn)
        
        // Force transparent background on bordered buttons
        if (htmlBtn.className.includes('variant-bordered') || htmlBtn.className.includes('border-primary')) {
          htmlBtn.style.setProperty('background-color', 'transparent', 'important')
          htmlBtn.style.setProperty('background', 'transparent', 'important')
          
          // Ensure text color is visible (primary color)
          if (computedStyle.color === 'rgb(0, 0, 0)' || 
              computedStyle.color === computedStyle.backgroundColor ||
              computedStyle.color === 'rgba(0, 0, 0, 0)') {
            htmlBtn.style.setProperty('color', primary, 'important')
          }
        }
      })
      
      // Only target buttons, links, and interactive elements - not all elements for performance
      const targets = document.querySelectorAll('button, a, [role="button"], [data-slot="base"]')
      
      targets.forEach((el) => {
        // Skip input elements
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
          return
        }
        
        const htmlEl = el as HTMLElement
        const computedStyle = window.getComputedStyle(htmlEl)
        const className = htmlEl.className || ''
        
        // Check if element has hardcoded color classes
        const hasHardcodedColor = defaultColors.some(color => 
          className.includes(color.replace('#', '')) || 
          className.includes(`bg-[${color}]`) ||
          className.includes(`text-[${color}]`) ||
          className.includes(`border-[${color}]`)
        )
        
        if (hasHardcodedColor || htmlEl.style.backgroundColor || htmlEl.style.color) {
          // Check background color
          const bgColor = computedStyle.backgroundColor
          if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
            const shouldReplace = defaultColors.some(c => bgColor.includes(c)) || 
                                 rgbColors.some(c => bgColor.includes(c))
            if (shouldReplace && !htmlEl.hasAttribute('data-theme-applied')) {
              htmlEl.style.setProperty('background-color', primary, 'important')
              htmlEl.setAttribute('data-theme-applied', 'true')
            }
          }
          
          // Check text color
          const textColor = computedStyle.color
          if (textColor) {
            const shouldReplace = defaultColors.some(c => textColor.includes(c)) ||
                                 rgbColors.some(c => textColor.includes(c))
            if (shouldReplace && !htmlEl.hasAttribute('data-theme-text-applied')) {
              htmlEl.style.setProperty('color', primary, 'important')
              htmlEl.setAttribute('data-theme-text-applied', 'true')
            }
          }
        }
      })
    }

    // Run with debouncing to avoid performance issues
    updateElementColors()
    const timeoutId1 = setTimeout(updateElementColors, 200)
    const timeoutId2 = setTimeout(updateElementColors, 500)
    
    const observer = new MutationObserver(() => {
      // Debounce updates
      setTimeout(updateElementColors, 100)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    })

    return () => {
      clearTimeout(timeoutId1)
      clearTimeout(timeoutId2)
      observer.disconnect()
    }
  }, [theme])

  return <>{children}</>
}

