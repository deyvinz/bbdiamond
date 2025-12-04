'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@heroui/react'
import { MotionFadeIn } from '@/components/ui/motion'
import type { HomepageCTA } from '@/lib/homepage-ctas-service'

interface HomepageCTAsProps {
  ctas: HomepageCTA[]
  defaultCTAs?: Array<{
    label: string
    href: string
    variant: 'primary' | 'bordered'
    condition?: boolean
  }>
}

export default function HomepageCTAs({ ctas, defaultCTAs = [] }: HomepageCTAsProps) {
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([])

  // If custom CTAs exist, use them; otherwise use defaults
  const buttonsToRender = ctas.length > 0 
    ? ctas.filter(cta => cta.is_visible)
    : defaultCTAs.filter(cta => cta.condition !== false)

  // Ensure bordered buttons have visible text color and maintain border on hover
  useEffect(() => {
    const primaryColor = getComputedStyle(document.documentElement)
      .getPropertyValue('--color-primary')
      .trim() || 
      getComputedStyle(document.documentElement)
      .getPropertyValue('--heroui-primary')
      .trim() ||
      '#C7A049' // fallback to default gold

    // Helper function to convert hex to rgba with opacity
    const hexToRgba = (hex: string, alpha: number): string => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
      if (!result) return `rgba(199, 160, 73, ${alpha})` // fallback
      const r = parseInt(result[1], 16)
      const g = parseInt(result[2], 16)
      const b = parseInt(result[3], 16)
      return `rgba(${r}, ${g}, ${b}, ${alpha})`
    }

    const applyStyles = (button: HTMLButtonElement) => {
      // Set text color with !important
      button.style.setProperty('color', primaryColor, 'important')
      button.style.setProperty('background-color', 'transparent', 'important')
      button.style.setProperty('background', 'transparent', 'important')
      // Ensure border color is maintained
      button.style.setProperty('border-color', primaryColor, 'important')
      button.style.setProperty('border-width', '2px', 'important')
    }

    const cleanupFunctions: Array<() => void> = []

    buttonRefs.current.forEach((button, idx) => {
      if (button && buttonsToRender[idx]?.variant === 'bordered') {
        applyStyles(button)
        
        // Add hover event listeners to maintain border and add contrasting background
        const handleMouseEnter = () => {
          button.style.setProperty('border-color', primaryColor, 'important')
          button.style.setProperty('border-width', '2px', 'important')
          // Add contrasting background shade (lighter version of primary color)
          const hoverBackground = hexToRgba(primaryColor, 0.15)
          button.style.setProperty('background-color', hoverBackground, 'important')
          button.style.setProperty('background', hoverBackground, 'important')
        }
        
        const handleMouseLeave = () => {
          button.style.setProperty('border-color', primaryColor, 'important')
          button.style.setProperty('border-width', '2px', 'important')
          // Remove background on leave
          button.style.setProperty('background-color', 'transparent', 'important')
          button.style.setProperty('background', 'transparent', 'important')
        }

        button.addEventListener('mouseenter', handleMouseEnter)
        button.addEventListener('mouseleave', handleMouseLeave)

        // Store cleanup function
        cleanupFunctions.push(() => {
          button.removeEventListener('mouseenter', handleMouseEnter)
          button.removeEventListener('mouseleave', handleMouseLeave)
        })
      }
    })

    // Return cleanup function for all event listeners
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup())
    }
  }, [buttonsToRender])

  if (buttonsToRender.length === 0) {
    return null
  }

  return (
    <MotionFadeIn delay={0.8} direction="up">
      <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center items-stretch sm:items-center px-4">
        {buttonsToRender.map((button, idx) => {
          // Both HomepageCTA and defaultCTA have the same structure
          const href = button.href
          const label = button.label
          const variant = button.variant

          return (
            <Link key={idx} href={href} className="w-full sm:w-auto">
              <Button
                ref={(el) => {
                  buttonRefs.current[idx] = el
                }}
                color="primary"
                variant={variant === 'primary' ? 'solid' : 'bordered'}
                size="lg"
                className={`w-full sm:w-auto rounded-2xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                  variant === 'primary'
                    ? 'shadow-lg hover:shadow-xl'
                    : 'border-2 !text-primary !border-primary bg-transparent hover:!border-primary'
                }`}
                radius="lg"
              >
                {label}
              </Button>
            </Link>
          )
        })}
      </div>
    </MotionFadeIn>
  )
}

