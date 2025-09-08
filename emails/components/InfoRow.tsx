import { Text } from '@react-email/components'
import * as React from 'react'

interface InfoRowProps {
  label: string
  value: string
  href?: string
}

export function InfoRow({ label, value, href }: InfoRowProps) {
  return (
    <Text style={rowStyle}>
      <span style={labelStyle}>{label}</span>
      {href ? (
        <a href={href} style={linkStyle}>
          {value}
        </a>
      ) : (
        <span style={valueStyle}>{value}</span>
      )}
    </Text>
  )
}

const rowStyle = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
}

const labelStyle = {
  fontWeight: '600',
  color: '#111111',
  marginRight: '8px',
}

const valueStyle = {
  color: '#4a4a4a',
}

const linkStyle = {
  color: '#C7A049',
  textDecoration: 'underline',
}
