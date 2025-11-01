import { supabaseService } from './supabase-service'
import type { WeddingTheme, ThemeUpdate } from './types/theme'

/**
 * Get theme for a wedding
 */
export async function getWeddingTheme(weddingId: string): Promise<WeddingTheme | null> {
  try {
    const supabase = supabaseService()
    const { data, error } = await supabase
      .from('wedding_themes')
      .select('*')
      .eq('wedding_id', weddingId)
      .single()

    if (error) {
      console.error('Error fetching wedding theme:', error)
      return null
    }

    return data as WeddingTheme
  } catch (error) {
    console.error('Error in getWeddingTheme:', error)
    return null
  }
}

/**
 * Update wedding theme
 */
export async function updateWeddingTheme(
  weddingId: string,
  updates: ThemeUpdate
): Promise<{ success: boolean; theme?: WeddingTheme; error?: string }> {
  try {
    const supabase = supabaseService()

    const { data, error } = await supabase
      .from('wedding_themes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('wedding_id', weddingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating wedding theme:', error)
      return { success: false, error: error.message }
    }

    return { success: true, theme: data as WeddingTheme }
  } catch (error) {
    console.error('Error in updateWeddingTheme:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Get CSS variables object from theme
 * This is used by ThemeProvider to inject styles
 */
export function getThemeCSSVars(theme: WeddingTheme): Record<string, string> {
  return {
    '--color-primary': theme.primary_color,
    '--color-secondary': theme.secondary_color,
    '--color-accent': theme.accent_color,
    '--color-gold-50': theme.gold_50,
    '--color-gold-100': theme.gold_100,
    '--color-gold-200': theme.gold_200,
    '--color-gold-300': theme.gold_300,
    '--color-gold-400': theme.gold_400,
    '--color-gold-500': theme.gold_500,
    '--color-gold-600': theme.gold_600,
    '--color-gold-700': theme.gold_700,
    '--color-gold-800': theme.gold_800,
    '--color-gold-900': theme.gold_900,
    '--color-background': theme.background_color,
    '--border-radius': theme.border_radius || '0.625rem',
    ...(theme.custom_css_vars || {}),
  }
}

/**
 * Get font family CSS from theme
 */
export function getThemeFonts(theme: WeddingTheme): { primary: string; secondary: string } {
  return {
    primary: theme.primary_font,
    secondary: theme.secondary_font,
  }
}

/**
 * Generate Tailwind-compatible color configuration from theme
 */
export function getTailwindColors(theme: WeddingTheme): Record<string, Record<string, string>> {
  return {
    gold: {
      50: theme.gold_50,
      100: theme.gold_100,
      200: theme.gold_200,
      300: theme.gold_300,
      400: theme.gold_400,
      500: theme.gold_500,
      600: theme.gold_600,
      700: theme.gold_700,
      800: theme.gold_800,
      900: theme.gold_900,
    },
    primary: {
      DEFAULT: theme.primary_color,
    },
    secondary: {
      DEFAULT: theme.secondary_color,
    },
    accent: {
      DEFAULT: theme.accent_color,
    },
  }
}

/**
 * Get Google Fonts URL for theme fonts
 */
export function getGoogleFontsURL(theme: WeddingTheme): string {
  const primary = theme.primary_font.replace(/\s+/g, '+')
  const secondary = theme.secondary_font.replace(/\s+/g, '+')
  const primaryWeights = theme.primary_font_weights.join(';')
  const secondaryWeights = theme.secondary_font_weights.join(';')

  return `https://fonts.googleapis.com/css2?family=${primary}:wght@${primaryWeights}&family=${secondary}:wght@${secondaryWeights}&display=swap`
}

/**
 * Get default theme (fallback when theme is not found)
 */
export function getDefaultTheme(): WeddingTheme {
  return {
    id: 'default',
    wedding_id: 'default',
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
    logo_url: null,
    favicon_url: null,
    email_logo_url: null,
    background_pattern: null,
    background_color: '#FFFFFF',
    border_radius: '0.625rem',
    shadow_style: null,
    custom_css_vars: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
}

