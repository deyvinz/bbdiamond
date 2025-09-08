import { Button } from '@react-email/components'
import * as React from 'react'

interface EmailButtonProps {
  href: string
  children: React.ReactNode
  ariaLabel?: string
}

export function EmailButton({ href, children, ariaLabel }: EmailButtonProps) {
  return (
    <Button
      href={href}
      style={buttonStyle}
      aria-label={ariaLabel}
    >
      {children}
    </Button>
  )
}

const buttonStyle = {
  backgroundColor: '#C7A049',
  borderRadius: '8px',
  color: '#111111',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  cursor: 'pointer',
  minWidth: '44px',
  lineHeight: '1.2',
}
