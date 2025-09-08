import { Text, Hr, Link } from '@react-email/components'
import * as React from 'react'

interface FooterProps {
  websiteUrl?: string
  contactEmail?: string
  replyToEmail?: string
}

export function Footer({ websiteUrl, contactEmail, replyToEmail }: FooterProps) {
  return (
    <>
      <Hr style={hrStyle} />
      <Text style={footerText}>
        We can't wait to celebrate with you ✨
      </Text>
      {websiteUrl && (
        <Text style={footerLink}>
          <Link href={websiteUrl} style={linkStyle}>
            Visit our website
          </Link>
        </Text>
      )}
      {(contactEmail || replyToEmail) && (
        <Text style={footerContact}>
          Questions? Contact us at{' '}
          <Link href={`mailto:${contactEmail || replyToEmail}`} style={linkStyle}>
            {contactEmail || replyToEmail}
          </Link>
        </Text>
      )}
    </>
  )
}

const hrStyle = {
  borderColor: '#EFE7D7',
  margin: '32px 0',
}

const footerText = {
  color: '#666666',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

const footerLink = {
  textAlign: 'center' as const,
  margin: '0 0 16px 0',
}

const footerContact = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
  textAlign: 'center' as const,
}

const linkStyle = {
  color: '#C7A049',
  textDecoration: 'underline',
}
