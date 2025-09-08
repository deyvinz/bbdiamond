import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
} from '@react-email/components'
import * as React from 'react'

interface BaseEmailLayoutProps {
  children: React.ReactNode
  preheader?: string
}

export function BaseEmailLayout({ children, preheader }: BaseEmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        {preheader && (
          <Text style={preheaderStyle}>
            {preheader}
          </Text>
        )}
        <Container style={container}>
          {children}
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#FFFFFF',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  margin: '0',
  padding: '0',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
  width: '100%',
}

const preheaderStyle = {
  display: 'none',
  fontSize: '1px',
  color: '#FFFFFF',
  lineHeight: '1px',
  maxHeight: '0px',
  maxWidth: '0px',
  opacity: 0,
  overflow: 'hidden',
}
