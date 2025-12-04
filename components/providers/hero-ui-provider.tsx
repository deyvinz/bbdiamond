'use client'

import { HeroUIProvider } from '@heroui/react'
import { ReactNode } from 'react'

interface HeroUIProviderWrapperProps {
  children: ReactNode
}

export function HeroUIProviderWrapper({ children }: HeroUIProviderWrapperProps) {
  return <HeroUIProvider>{children}</HeroUIProvider>
}
