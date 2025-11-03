import type { Config } from 'tailwindcss'
import defaultTheme from 'tailwindcss/defaultTheme'
import { heroui } from '@heroui/react'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx,js,jsx}',
    './components/**/*.{ts,tsx,js,jsx}',
    './components/ui/**/*.{ts,tsx}',
    './node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1200px' } },
    extend: {
      colors: {
        gold: {
          50: 'var(--color-gold-50, #FFF8E6)',
          100: 'var(--color-gold-100, #FDECC8)',
          200: 'var(--color-gold-200, #F7DC9F)',
          300: 'var(--color-gold-300, #EEC874)',
          400: 'var(--color-gold-400, #E1B858)',
          500: 'var(--color-gold-500, #CDA349)',
          600: 'var(--color-gold-600, #B38D39)',
          700: 'var(--color-gold-700, #8C6E2C)',
          800: 'var(--color-gold-800, #6B531F)',
          900: 'var(--color-gold-900, #4A3915)',
        },
        primary: {
          DEFAULT: 'var(--color-primary, #CDA349)',
        },
        secondary: {
          DEFAULT: 'var(--color-secondary, #B38D39)',
        },
        accent: {
          DEFAULT: 'var(--color-accent, #E1B858)',
        },
      },
      fontFamily: {
        serif: ['var(--font-secondary, "Playfair Display")', ...defaultTheme.fontFamily.serif],
        sans: ['var(--font-primary, Inter)', ...defaultTheme.fontFamily.sans],
        primary: ['var(--font-primary, Inter)', ...defaultTheme.fontFamily.sans],
        secondary: ['var(--font-secondary, "Playfair Display")', ...defaultTheme.fontFamily.serif],
      },
      borderRadius: { 
        DEFAULT: 'var(--border-radius, 0.625rem)',
        sm: 'calc(var(--border-radius, 0.625rem) - 0.125rem)',
        md: 'var(--border-radius, 0.625rem)',
        lg: 'calc(var(--border-radius, 0.625rem) + 0.125rem)',
        xl: '1rem', 
        '2xl': '1.25rem' 
      },
      boxShadow: {
        gold: 'var(--shadow-gold, 0 1px 0 0 rgba(205,163,73,0.35), 0 12px 30px rgba(0,0,0,0.06))',
      },
      backgroundImage: {
        foil: 'linear-gradient(125deg,#b9933b,#e1ba63 40%,#9b7a2a 60%,#f1d279 80%)',
        subtleGrid:
          'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.04) 1px, transparent 0)',
      },
    }
  },
  plugins: [
    require('tailwindcss-animate'),
    heroui({
      themes: {
        light: {
          colors: {
            primary: 'var(--color-primary, #CDA349)', // gold-500 - dynamic from theme
            secondary: 'var(--color-secondary, #E1B858)', // gold-400 - dynamic from theme
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
          },
        },
        dark: {
          colors: {
            primary: 'var(--color-primary, #E1B858)', // gold-400 - dynamic from theme
            secondary: 'var(--color-secondary, #CDA349)', // gold-500 - dynamic from theme
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
          },
        },
      },
      layout: {
        radius: {
          small: 'var(--border-radius, 0.5rem)', // rounded-lg - dynamic from theme
          medium: 'var(--border-radius, 0.75rem)', // rounded-xl - dynamic from theme
          large: 'var(--border-radius, 1rem)', // rounded-2xl - dynamic from theme
        },
      },
    }),
  ],
}
export default config
