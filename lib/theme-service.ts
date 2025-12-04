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
  // Helper to convert hex to rgba for shadows
  const hexToRgba = (hex: string, alpha: number = 1): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!result) return `rgba(0, 0, 0, ${alpha})`
    const r = parseInt(result[1], 16)
    const g = parseInt(result[2], 16)
    const b = parseInt(result[3], 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  const primary = theme.primary_color || theme.gold_500
  const primaryRgba = hexToRgba(primary, 0.35)

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
    // Shadow style support - use theme shadow or generate from primary color
    '--shadow-gold': theme.shadow_style || `0 1px 0 0 ${primaryRgba}, 0 12px 30px rgba(0,0,0,0.06)`,
    // Background pattern support
    '--background-pattern': theme.background_pattern ? `url(${theme.background_pattern})` : 'none',
    ...(theme.custom_css_vars || {}),
  }
}

/**
 * Calculate relative luminance of a color (0-1)
 * Used to determine if a color is light or dark for contrast
 */
function getLuminance(hex: string): number {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return 0.5 // Default to medium if invalid
  
  const r = parseInt(result[1], 16) / 255
  const g = parseInt(result[2], 16) / 255
  const b = parseInt(result[3], 16) / 255
  
  // Convert to relative luminance using WCAG formula
  const [rLinear, gLinear, bLinear] = [r, g, b].map(val => {
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  })
  
  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear
}

/**
 * Get contrasting text color (white or black) based on background color
 */
function getContrastTextColor(backgroundColor: string): string {
  const luminance = getLuminance(backgroundColor)
  // If background is light (luminance > 0.5), use dark text, otherwise use light text
  return luminance > 0.5 ? '#111827' : '#FFFFFF'
}

/**
 * Generate CSS string for HeroUI theme overrides
 * HeroUI generates CSS variables at build time, so we need to override them
 * using CSS with higher specificity that targets HeroUI's generated classes
 */
export function getHeroUIThemeCSS(theme: WeddingTheme): string {
  const primary = theme.primary_color || theme.gold_500
  const secondary = theme.secondary_color || theme.gold_400
  const hoverColor = theme.gold_600 || primary
  const primary50 = theme.gold_50 || '#FFF8E6'
  const primary100 = theme.gold_100 || '#FDECC8'
  
  // Calculate contrasting text colors for accent and secondary backgrounds
  const accentContrastText = getContrastTextColor(theme.accent_color)
  const secondaryContrastText = getContrastTextColor(theme.secondary_color)
  const primaryContrastText = getContrastTextColor(primary)
  const hoverContrastText = getContrastTextColor(hoverColor)
  
  // Calculate contrasting text colors for gold scale (for backgrounds)
  const gold50ContrastText = getContrastTextColor(theme.gold_50)
  const gold100ContrastText = getContrastTextColor(theme.gold_100)
  const gold200ContrastText = getContrastTextColor(theme.gold_200)
  const gold300ContrastText = getContrastTextColor(theme.gold_300)
  const gold400ContrastText = getContrastTextColor(theme.gold_400)
  const gold500ContrastText = getContrastTextColor(theme.gold_500)
  const gold600ContrastText = getContrastTextColor(theme.gold_600)
  const gold700ContrastText = getContrastTextColor(theme.gold_700)
  const gold800ContrastText = getContrastTextColor(theme.gold_800)
  const gold900ContrastText = getContrastTextColor(theme.gold_900)
  
  // HeroUI uses Tailwind utility classes that reference CSS variables
  // We'll use attribute selectors to override any element with HeroUI primary color classes
  // This approach uses !important to ensure our dynamic theme takes precedence
  return `
    /* ========================================
       CRITICAL: Exclude checkboxes and radio buttons from theme overrides
       ======================================== */
    /* Radix UI Checkbox and Radio components must preserve their own styling */
    [role="checkbox"],
    [role="radio"],
    [data-radix-checkbox-root],
    [data-radix-checkbox-indicator],
    [data-radix-radio-item],
    [data-radix-radio-indicator],
    button[role="checkbox"],
    button[role="radio"] {
      /* Preserve component's own border-radius, background, and styling */
      /* Theme colors should not override checkbox/radio component styles */
    }
    
    /* ========================================
       CRITICAL: Ensure input fields always have white/clear backgrounds
       ======================================== */
    input[type="text"],
    input[type="email"],
    input[type="password"],
    input[type="number"],
    input[type="tel"],
    input[type="url"],
    input[type="search"],
    input[type="date"],
    input[type="time"],
    input[type="datetime-local"],
    input[type="month"],
    input[type="week"],
    textarea,
    select,
    [data-slot="input"],
    [data-slot="textarea"],
    input:not([type="checkbox"]):not([type="radio"]):not([role="checkbox"]):not([data-radix-checkbox-root]),
    input[class*="bg-"]:not([class*="bg-transparent"]):not([class*="bg-white"]):not([type="checkbox"]):not([type="radio"]):not([role="checkbox"]):not([data-radix-checkbox-root]),
    textarea[class*="bg-"]:not([class*="bg-transparent"]):not([class*="bg-white"]),
    [class*="bg-input"]:not([role="checkbox"]):not([data-radix-checkbox-root]) {
      background-color: #FFFFFF !important;
      background: #FFFFFF !important;
    }
    
    /* ========================================
       Ensure Select dropdown items have white backgrounds
       ======================================== */
    [data-slot="select-item"],
    [data-slot="select-content"],
    [data-slot="select-item"][data-state="checked"],
    [data-slot="select-item"][data-highlighted],
    [data-slot="select-item"]:hover {
      background-color: #FFFFFF !important;
      background: #FFFFFF !important;
      color: #111827 !important;
    }
    
    [data-slot="select-item"]:hover,
    [data-slot="select-item"][data-highlighted] {
      background-color: #F3F4F6 !important;
      background: #F3F4F6 !important;
    }
    
    [data-slot="select-item"][data-state="checked"] {
      background-color: #F9FAFB !important;
      background: #F9FAFB !important;
    }
    
    /* ========================================
       Override hardcoded hex color classes
       Tailwind arbitrary values like bg-[#C8A951] generate specific classes
       We'll use style attribute targeting as a fallback and class attribute matching
       ======================================== */
    /* Target elements by style attribute for inline styles */
    [style*="background-color: rgb(200, 169, 81)"],
    [style*="background-color:#C8A951"],
    [style*="background-color: #C8A951"],
    [style*="background: rgb(200, 169, 81)"],
    [style*="background:#C8A951"],
    [style*="background: #C8A951"] {
      background-color: ${primary} !important;
      background: ${primary} !important;
    }
    
    /* Target by Tailwind's arbitrary value class pattern */
    /* Note: Tailwind compiles bg-[#C8A951] to a unique class, so we use a broad selector */
    button:not(input):not(textarea):not(select)[style*="#C8A951"],
    button:not(input):not(textarea):not(select)[style*="#CDA349"],
    button:not(input):not(textarea):not(select)[style*="#B38D39"],
    
    button:not(input):not(textarea):not(select)[style*="#E1B858"] {
      background-color: ${primary} !important;
    }
    
    button:not(input):not(textarea):not(select)[style*="#C8A951"]:hover,
    button:not(input):not(textarea):not(select)[style*="#CDA349"]:hover,
    button:not(input):not(textarea):not(select)[style*="#B38D39"]:hover {
      background-color: ${hoverColor} !important;
    }
    
    /* Text colors via style attribute */
    [style*="color: rgb(200, 169, 81)"],
    [style*="color:#C8A951"],
    [style*="color: #C8A951"],
    [style*="color:#CDA349"],
    [style*="color: #CDA349"] {
      color: ${primary} !important;
    }
    
    /* Border colors via style attribute */
    [style*="border-color: rgb(200, 169, 81)"],
    [style*="border-color:#C8A951"],
    [style*="border-color: #C8A951"] {
      border-color: ${primary} !important;
    }
    
    /* Use a more targeted approach for Tailwind arbitrary classes */
    /* We'll inject a script or use broader selectors that catch computed styles */
    /* For now, target common patterns - buttons and interactive elements with gold colors */
    button[class*="bg-"]:not([class*="bg-white"]):not([class*="bg-transparent"]):not(input):not(textarea):not(select),
    a[class*="bg-"]:not([class*="bg-white"]):not([class*="bg-transparent"]) {
      /* Let primary color override handle these */
    }
    
    /* ========================================
       HeroUI primary color overrides
       ======================================== */
    /* Override HeroUI primary color for buttons and interactive elements */
    /* EXCLUDE checkboxes and radio buttons */
    button[class*="bg-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    [class*="bg-primary-"]:not([class*="bg-primary-foreground"]):not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    [class*="bg-primary"]:not(input):not(textarea):not(select):not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: ${primary} !important;
      color: ${primaryContrastText} !important;
    }
    
    button[class*="bg-primary"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="bg-primary"]:focus:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    [class*="bg-primary"]:hover:not([class*="bg-primary-foreground"]):not(input):not(textarea):not(select):not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: ${hoverColor} !important;
      color: ${hoverContrastText} !important;
    }
    
    /* Override text colors */
    [class*="text-primary"]:not([class*="text-primary-foreground"]),
    [class*="text-primary-"]:not([class*="text-primary-foreground"]),
    h1[class*="text-"],
    h2[class*="text-"],
    h3[class*="text-"],
    h4[class*="text-"],
    h5[class*="text-"],
    h6[class*="text-"] {
      color: inherit;
    }
    
    /* Primary text color where explicitly used */
    [class*="text-primary"]:not([class*="text-primary-foreground"]):not(input):not(textarea),
    [class*="text-primary-"]:not([class*="text-primary-foreground"]):not(input):not(textarea) {
      color: ${primary} !important;
    }
    
    /* Override border colors */
    [class*="border-primary"]:not([class*="border-primary-foreground"]),
    [class*="border-primary-"]:not([class*="border-primary-foreground"]) {
      border-color: ${primary} !important;
    }
    
    /* HeroUI bordered button variant - ensure text and border use theme color with transparent background */
    /* Target all possible HeroUI button structures with bordered variant */
    /* EXCLUDE checkboxes and radio buttons */
    button[data-slot="base"][class*="border-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"].border-primary:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"][class*="border-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="text-primary"][class*="variant-bordered"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="bg-transparent"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"][data-slot="base"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="variant-bordered"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    /* Direct targeting for HeroUI Button with bordered variant and primary color */
    button[class*="bg-primary"][class*="variant-bordered"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"][class*="bg-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    /* Override any background on bordered buttons */
    a > button[class*="variant-bordered"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"]:not([class*="variant-solid"]):not([class*="variant-flat"]):not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      border-color: ${primary} !important;
      color: ${primary} !important;
      background-color: transparent !important;
      background: transparent !important;
      background-image: none !important;
    }
    
    /* Hover states for bordered buttons */
    button[data-slot="base"][class*="border-primary"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"].border-primary:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"][class*="border-primary"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="bg-transparent"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"][data-slot="base"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="variant-bordered"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="variant-bordered"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      border-color: ${hoverColor} !important;
      color: ${hoverColor} !important;
      background-color: ${primary50} !important;
      background: ${primary50} !important;
    }
    
    /* Override HeroUI's primary button background for bordered variant only */
    button[data-slot="base"][class*="bg-primary"]:not([class*="variant-solid"]):not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="bg-primary"][class*="variant-bordered"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: transparent !important;
      background: transparent !important;
      color: ${primary} !important;
    }
    
    /* Override ring/outline colors */
    [class*="ring-primary"],
    [class*="outline-primary"] {
      --tw-ring-color: ${primary} !important;
      outline-color: ${primary} !important;
    }
    
    /* Target HeroUI Button component specifically with data attributes */
    /* EXCLUDE checkboxes and radio buttons */
    button[data-slot="base"][class*="bg-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[data-slot="base"][class*="text-primary"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: ${primary} !important;
      color: ${theme.background_color || '#FFFFFF'} !important;
    }
    
    /* Override any HeroUI component with color="primary" prop */
    [data-color="primary"] {
      --heroui-primary: ${primary} !important;
    }
    
    /* ========================================
       Additional UI elements (Chips, Badges, Icons, etc.)
       ======================================== */
    /* Chip components */
    [class*="Chip"][class*="bg-"],
    span[class*="bg-"]:not(input):not(textarea),
    [role="status"][class*="bg-"] {
      /* Chips with primary colors */
    }
    
    /* Accordion indicators - use theme primary color */
    [data-slot="indicator"],
    [data-slot="indicator"] svg,
    [data-slot="select-indicator"] {
      color: ${primary} !important;
      transition: transform 200ms ease !important;
    }
    
    /* Accordion indicator rotation when open */
    [data-slot="base"][data-selected="true"] [data-slot="indicator"],
    [data-slot="base"][data-selected="true"] [data-slot="indicator"] svg,
    [data-slot="trigger"][aria-expanded="true"] [data-slot="indicator"],
    [data-slot="trigger"][aria-expanded="true"] [data-slot="indicator"] svg {
      transform: rotate(180deg) !important;
    }
    
    /* Icon colors in primary contexts */
    svg[class*="text-\\[#"],
    svg[class*="text-primary"],
    path[fill*="#C8A951"],
    path[fill*="#CDA349"] {
      color: ${primary} !important;
    }
    
    /* Avatar fallback backgrounds */
    [class*="AvatarFallback"][class*="bg-"],
    [class*="bg-\\[#C8A951\\]/10"] {
      background-color: ${primary50} !important;
    }
    
    /* Progress bars and indicators */
    [role="progressbar"][class*="bg-"],
    [class*="Progress"][class*="bg-"] {
      background-color: ${primary} !important;
    }
    
    /* Checkbox and switch checked states - exclude switches which have their own styling */
    /* NOTE: Radix UI checkboxes use data-state="checked" and have their own styling */
    /* Only apply theme colors to native HTML checkboxes, not Radix UI components */
    input[type="checkbox"]:checked:not([role="checkbox"]):not([data-radix-checkbox-root]),
    input[type="radio"]:checked:not([role="radio"]):not([data-radix-radio-item]),
    [data-state="checked"][class*="bg-"]:not([role="switch"]):not([role="checkbox"]):not([data-radix-checkbox-root]) {
      border-color: ${primary} !important;
    }
    
    /* Explicitly exclude Radix UI checkbox from theme overrides */
    [role="checkbox"],
    [data-radix-checkbox-root],
    [data-radix-checkbox-indicator] {
      /* Preserve component's own styling - don't override */
    }
    
    /* Links with primary color */
    a[class*="text-\\[#"],
    a[class*="text-primary"]:not([class*="text-primary-foreground"]) {
      color: ${primary} !important;
    }
    
    a[class*="text-\\[#"]:hover,
    a[class*="text-primary"]:hover:not([class*="text-primary-foreground"]) {
      color: ${hoverColor} !important;
    }
    
    /* ========================================
       CSS custom properties for broader theming
       ======================================== */
    :root {
      --heroui-primary-500: ${primary} !important;
      --heroui-primary: ${primary} !important;
      --heroui-secondary-500: ${secondary} !important;
      --heroui-secondary: ${secondary} !important;
      --color-primary-dynamic: ${primary} !important;
      --color-primary-hover: ${hoverColor} !important;
      
      /* Accent color support */
      --color-accent: ${theme.accent_color} !important;
      --heroui-accent: ${theme.accent_color} !important;
      
      /* Secondary color support */
      --color-secondary: ${theme.secondary_color} !important;
      --heroui-secondary: ${theme.secondary_color} !important;
      
      /* Border radius from theme */
      --radius: ${theme.border_radius || '0.625rem'} !important;
      --border-radius: ${theme.border_radius || '0.625rem'} !important;
      
      /* Shadow style from theme */
      --shadow-gold: ${theme.shadow_style || `0 1px 0 0 rgba(205,163,73,0.35), 0 12px 30px rgba(0,0,0,0.06)`} !important;
      
      /* Gold color scale - full dynamic support */
      --color-gold-50: ${theme.gold_50} !important;
      --color-gold-100: ${theme.gold_100} !important;
      --color-gold-200: ${theme.gold_200} !important;
      --color-gold-300: ${theme.gold_300} !important;
      --color-gold-400: ${theme.gold_400} !important;
      --color-gold-500: ${theme.gold_500} !important;
      --color-gold-600: ${theme.gold_600} !important;
      --color-gold-700: ${theme.gold_700} !important;
      --color-gold-800: ${theme.gold_800} !important;
      --color-gold-900: ${theme.gold_900} !important;
    }
    
    /* Apply accent color to accent classes - separate rules for proper contrast */
    [class*="bg-accent"]:not(input):not(textarea):not(select) {
      background-color: ${theme.accent_color} !important;
      color: ${accentContrastText} !important;
    }
    [class*="text-accent"]:not(input):not(textarea) {
      color: ${theme.accent_color} !important;
    }
    [class*="border-accent"] {
      border-color: ${theme.accent_color} !important;
    }
    
    /* Apply secondary color to secondary classes - separate rules for proper contrast */
    [class*="bg-secondary"]:not(input):not(textarea):not(select) {
      background-color: ${theme.secondary_color} !important;
      color: ${secondaryContrastText} !important;
    }
    [class*="text-secondary"]:not(input):not(textarea) {
      color: ${theme.secondary_color} !important;
    }
    [class*="border-secondary"] {
      border-color: ${theme.secondary_color} !important;
    }
    
    /* ========================================
       Dropdown Menu Styling - Ensure proper contrast and theme colors
       ======================================== */
    /* Dropdown menu content background */
    [data-radix-dropdown-menu-content],
    [data-radix-dropdown-menu-content] > *,
    [data-radix-popper-content-wrapper] [data-radix-dropdown-menu-content] {
      background-color: #FFFFFF !important;
      border-color: #E5E7EB !important;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
    }
    
    /* Dropdown menu items - ensure proper text color */
    [data-radix-dropdown-menu-item],
    [role="menuitem"],
    button[data-radix-dropdown-menu-item] {
      color: #111827 !important; /* Dark gray text for contrast */
      background-color: transparent !important;
    }
    
    /* Dropdown menu item hover/focus states - use theme color with light background */
    [data-radix-dropdown-menu-item]:hover,
    [data-radix-dropdown-menu-item]:focus,
    [data-radix-dropdown-menu-item][data-highlighted],
    [data-radix-dropdown-menu-item][data-state="checked"],
    [role="menuitem"]:hover,
    [role="menuitem"]:focus,
    button[data-radix-dropdown-menu-item]:hover,
    button[data-radix-dropdown-menu-item]:focus {
      background-color: ${primary50} !important; /* Light theme color background */
      color: #111827 !important; /* Keep dark text for contrast */
    }
    
    /* Dropdown menu items with accent class - use theme primary color */
    [data-radix-dropdown-menu-item][class*="focus:bg-accent"],
    [data-radix-dropdown-menu-item][class*="focus:text-accent-foreground"]:hover,
    [data-radix-dropdown-menu-item][class*="focus:text-accent-foreground"]:focus {
      background-color: ${primary50} !important;
      color: #111827 !important;
    }
    
    /* Dropdown menu label - ensure readable text */
    [data-radix-dropdown-menu-label],
    [role="menuitem"] > [class*="font-semibold"],
    [data-radix-dropdown-menu-label] {
      color: #374151 !important; /* Medium gray for labels */
      font-weight: 600 !important;
    }
    
    /* Dropdown menu separator */
    [data-radix-dropdown-menu-separator],
    [role="separator"],
    [data-radix-dropdown-menu-separator] {
      background-color: #E5E7EB !important;
      height: 1px !important;
    }
    
    /* Dropdown menu items with destructive/red styling */
    [data-radix-dropdown-menu-item][class*="text-red"],
    [data-radix-dropdown-menu-item].text-red-600 {
      color: #DC2626 !important; /* Red-600 for destructive actions */
    }
    
    [data-radix-dropdown-menu-item][class*="text-red"]:hover,
    [data-radix-dropdown-menu-item][class*="text-red"]:focus,
    [data-radix-dropdown-menu-item].text-red-600:hover,
    [data-radix-dropdown-menu-item].text-red-600:focus {
      background-color: #FEF2F2 !important; /* Red-50 background on hover */
      color: #DC2626 !important;
    }
    
    /* ========================================
       Ghost Button Styling - Ensure proper contrast and theme colors
       ======================================== */
    /* Ghost button variant - ensure text is visible */
    button[class*="bg-transparent"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button.variant-ghost,
    button[class*="variant-ghost"],
    button[class*="text-gray-700"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      color: #374151 !important; /* Dark gray text */
      background-color: transparent !important;
    }
    
    /* Ghost button hover state - use theme color */
    button[class*="bg-transparent"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button.variant-ghost:hover,
    button[class*="variant-ghost"]:hover,
    button[class*="text-gray-700"]:hover:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button[class*="hover:bg-gray-100"]:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: ${primary50} !important; /* Light theme color on hover */
      color: #111827 !important; /* Darker text on hover */
      border-color: transparent !important;
    }
    
    /* Ghost button focus state */
    button[class*="bg-transparent"]:focus:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button.variant-ghost:focus,
    button[class*="variant-ghost"]:focus,
    button[class*="text-gray-700"]:focus:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]) {
      background-color: ${primary50} !important;
      color: #111827 !important;
      outline-color: ${primary} !important;
      ring-color: ${primary} !important;
    }
    
    /* Ghost button icons - ensure they inherit text color */
    button[class*="bg-transparent"] svg:not([role="checkbox"]):not([role="radio"]):not([data-radix-checkbox-root]):not([data-radix-radio-item]),
    button.variant-ghost svg,
    button[class*="variant-ghost"] svg {
      color: inherit !important;
    }
    
    /* Apply border radius globally - EXCLUDE checkboxes, radio buttons, and Radix UI components */
    button:not([role="checkbox"]):not([data-state]),
    input:not([type="checkbox"]):not([type="radio"]),
    textarea,
    select,
    [class*="rounded"]:not([role="checkbox"]):not([data-state]):not([data-radix-checkbox-root]) {
      border-radius: ${theme.border_radius || '0.625rem'} !important;
    }
    
    /* Explicitly preserve checkbox and radio button styling */
    [role="checkbox"],
    [data-radix-checkbox-root],
    input[type="checkbox"],
    input[type="radio"] {
      border-radius: 0.125rem !important; /* rounded-sm - preserve small radius */
      background-color: transparent !important;
      background: transparent !important;
    }
    
    /* Unchecked checkbox state - ensure white/transparent background */
    [role="checkbox"]:not([data-state="checked"]),
    [data-radix-checkbox-root]:not([data-state="checked"]),
    input[type="checkbox"]:not(:checked) {
      background-color: #FFFFFF !important;
      background: #FFFFFF !important;
    }
    
    /* Checked checkbox state - use theme color but preserve checkbox component styling */
    [role="checkbox"][data-state="checked"],
    [data-radix-checkbox-root][data-state="checked"],
    input[type="checkbox"]:checked {
      /* Let the checkbox component's own classes handle the checked state */
      /* Only override if theme color is explicitly needed */
    }
    
    /* Apply shadow-gold class with theme shadow */
    .shadow-gold,
    [class*="shadow-gold"] {
      box-shadow: ${theme.shadow_style || `0 1px 0 0 rgba(205,163,73,0.35), 0 12px 30px rgba(0,0,0,0.06)`} !important;
    }
    
    /* Apply gold color scale to Tailwind gold classes - with proper contrast */
    [class*="bg-gold-50"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_50} !important;
      color: ${gold50ContrastText} !important;
    }
    [class*="bg-gold-100"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_100} !important;
      color: ${gold100ContrastText} !important;
    }
    [class*="bg-gold-200"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_200} !important;
      color: ${gold200ContrastText} !important;
    }
    [class*="bg-gold-300"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_300} !important;
      color: ${gold300ContrastText} !important;
    }
    [class*="bg-gold-400"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_400} !important;
      color: ${gold400ContrastText} !important;
    }
    [class*="bg-gold-500"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_500} !important;
      color: ${gold500ContrastText} !important;
    }
    [class*="bg-gold-600"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_600} !important;
      color: ${gold600ContrastText} !important;
    }
    [class*="bg-gold-700"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_700} !important;
      color: ${gold700ContrastText} !important;
    }
    [class*="bg-gold-800"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_800} !important;
      color: ${gold800ContrastText} !important;
    }
    [class*="bg-gold-900"]:not(input):not(textarea):not(select) {
      background-color: ${theme.gold_900} !important;
      color: ${gold900ContrastText} !important;
    }
    
    /* Specific text color overrides */
    [class*="text-gold-50"] { color: ${theme.gold_50} !important; }
    [class*="text-gold-100"] { color: ${theme.gold_100} !important; }
    [class*="text-gold-200"] { color: ${theme.gold_200} !important; }
    [class*="text-gold-300"] { color: ${theme.gold_300} !important; }
    [class*="text-gold-400"] { color: ${theme.gold_400} !important; }
    [class*="text-gold-500"] { color: ${theme.gold_500} !important; }
    [class*="text-gold-600"] { color: ${theme.gold_600} !important; }
    [class*="text-gold-700"] { color: ${theme.gold_700} !important; }
    [class*="text-gold-800"] { color: ${theme.gold_800} !important; }
    [class*="text-gold-900"] { color: ${theme.gold_900} !important; }
    
    /* Border color overrides */
    [class*="border-gold-50"] { border-color: ${theme.gold_50} !important; }
    [class*="border-gold-100"] { border-color: ${theme.gold_100} !important; }
    [class*="border-gold-200"] { border-color: ${theme.gold_200} !important; }
    [class*="border-gold-300"] { border-color: ${theme.gold_300} !important; }
    [class*="border-gold-400"] { border-color: ${theme.gold_400} !important; }
    [class*="border-gold-500"] { border-color: ${theme.gold_500} !important; }
    [class*="border-gold-600"] { border-color: ${theme.gold_600} !important; }
    [class*="border-gold-700"] { border-color: ${theme.gold_700} !important; }
    [class*="border-gold-800"] { border-color: ${theme.gold_800} !important; }
    [class*="border-gold-900"] { border-color: ${theme.gold_900} !important; }
  `
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

