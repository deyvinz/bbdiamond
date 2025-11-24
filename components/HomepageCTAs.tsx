'use client'

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
  // If custom CTAs exist, use them; otherwise use defaults
  const buttonsToRender = ctas.length > 0 
    ? ctas.filter(cta => cta.is_visible)
    : defaultCTAs.filter(cta => cta.condition !== false)

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
                color="primary"
                variant={variant === 'primary' ? 'solid' : 'bordered'}
                size="lg"
                className={`w-full sm:w-auto rounded-2xl font-semibold transition-all duration-300 text-sm sm:text-base ${
                  variant === 'primary'
                    ? 'shadow-lg hover:shadow-xl'
                    : 'border-2 text-primary bg-transparent hover:bg-primary/10 !bg-transparent'
                }`}
                radius="lg"
                style={
                  variant === 'bordered'
                    ? { backgroundColor: 'transparent', color: 'var(--color-primary, var(--heroui-primary))' }
                    : undefined
                }
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

