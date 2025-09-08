import { Text } from '@react-email/components'
import * as React from 'react'

interface SectionHeadingProps {
  children: React.ReactNode
  level?: 1 | 2 | 3
}

export function SectionHeading({ children, level = 2 }: SectionHeadingProps) {
  return (
    <Text
      style={level === 1 ? h1Style : level === 2 ? h2Style : h3Style}
    >
      {children}
    </Text>
  )
}

const h1Style = {
  color: '#111111',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  letterSpacing: '0.5px',
  lineHeight: '1.2',
}

const h2Style = {
  color: '#111111',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  letterSpacing: '0.3px',
  lineHeight: '1.3',
}

const h3Style = {
  color: '#111111',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  letterSpacing: '0.2px',
  lineHeight: '1.4',
}
