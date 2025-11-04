export interface WeddingTheme {
  id: string
  wedding_id: string
  primary_color: string
  secondary_color: string
  accent_color: string
  gold_50: string
  gold_100: string
  gold_200: string
  gold_300: string
  gold_400: string
  gold_500: string
  gold_600: string
  gold_700: string
  gold_800: string
  gold_900: string
  primary_font: string
  secondary_font: string
  primary_font_weights: string[]
  secondary_font_weights: string[]
  logo_url?: string | null
  favicon_url?: string | null
  email_logo_url?: string | null
  background_pattern?: string | null
  background_color: string
  border_radius?: string | null
  shadow_style?: string | null
  custom_css_vars?: Record<string, string> | null
  created_at: string
  updated_at: string
}

export interface ThemeUpdate {
  primary_color?: string
  secondary_color?: string
  accent_color?: string
  gold_50?: string
  gold_100?: string
  gold_200?: string
  gold_300?: string
  gold_400?: string
  gold_500?: string
  gold_600?: string
  gold_700?: string
  gold_800?: string
  gold_900?: string
  primary_font?: string
  secondary_font?: string
  primary_font_weights?: string[]
  secondary_font_weights?: string[]
  logo_url?: string
  favicon_url?: string
  email_logo_url?: string
  background_pattern?: string
  background_color?: string
  border_radius?: string
  shadow_style?: string
  custom_css_vars?: Record<string, string>
}

