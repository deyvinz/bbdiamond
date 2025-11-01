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
          50:'#FFF8E6',100:'#FDECC8',200:'#F7DC9F',300:'#EEC874',400:'#E1B858',
          500:'#CDA349',600:'#B38D39',700:'#8C6E2C',800:'#6B531F',900:'#4A3915'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', ...defaultTheme.fontFamily.serif],
        sans: ['Inter', ...defaultTheme.fontFamily.sans],
      },
      borderRadius: { xl: '1rem', '2xl': '1.25rem' },
      boxShadow: {
        gold: '0 1px 0 0 rgba(205,163,73,0.35), 0 12px 30px rgba(0,0,0,0.06)',
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
            primary: '#CDA349', // gold-500
            secondary: '#E1B858', // gold-400
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
          },
        },
        dark: {
          colors: {
            primary: '#E1B858', // gold-400
            secondary: '#CDA349', // gold-500
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
          },
        },
      },
    }),
  ],
}
export default config
