import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from '@react-email/components'
import * as React from 'react'
import { BaseEmailLayout } from './BaseEmailLayout'
import { EmailButton } from './components/EmailButton'
import { SectionHeading } from './components/SectionHeading'
import { InfoRow } from './components/InfoRow'
import { Footer } from './components/Footer'

export interface InvitationEmailProps {
  guestName: string
  inviteCode: string
  rsvpUrl: string
  eventName: string
  eventDate: string
  eventVenue: string
  eventAddress?: string
  addToCalendarUrl?: string
  qrImageUrl?: string
  heroImageUrl?: string
  registryUrl?: string
  travelUrl?: string
  contactEmail?: string
  replyToEmail?: string
}

export function InvitationEmail({
  guestName,
  inviteCode,
  rsvpUrl,
  eventName,
  eventDate,
  eventVenue,
  eventAddress,
  addToCalendarUrl,
  qrImageUrl,
  heroImageUrl,
  registryUrl,
  travelUrl,
  contactEmail,
  replyToEmail,
}: InvitationEmailProps) {
  const preheaderText = `RSVP for ${eventName} — ${eventDate}`
  const mapUrl = eventAddress ? `https://maps.google.com/maps?q=${encodeURIComponent(eventAddress)}` : undefined

  return (
    <BaseEmailLayout preheader={preheaderText}>
      {/* Header */}
      <Section style={header}>
        <Heading style={headerTitle}>Brenda & Diamond</Heading>
        <Text style={headerSubtitle}>Wedding Celebration</Text>
        <Hr style={headerRule} />
      </Section>

      {/* Hero Image */}
      {heroImageUrl && (
        <Section style={heroSection}>
          <Img
            src={heroImageUrl}
            alt="Wedding celebration"
            style={heroImage}
          />
        </Section>
      )}

      {/* Main Content */}
      <Section style={content}>
        <Text style={greeting}>Dear {guestName},</Text>
        
        <Text style={paragraph}>
          We are delighted to invite you to celebrate our special day with us!
        </Text>

        <Text style={paragraph}>
          Your presence would make our wedding celebration even more meaningful.
        </Text>

        {/* Event Details Card */}
        <Section style={eventCard}>
          <SectionHeading level={2}>
            {eventName}
          </SectionHeading>
          
          <InfoRow label="📅 Date:" value={eventDate} />
          <InfoRow label="🕒 Time:" value={eventDate.split(' · ')[1] || ''} />
          <InfoRow 
            label="📍 Venue:" 
            value={eventVenue}
            href={mapUrl}
          />
          {eventAddress && (
            <InfoRow 
              label="🏠 Address:" 
              value={eventAddress}
              href={mapUrl}
            />
          )}
        </Section>

        {/* RSVP Button */}
        <Section style={buttonContainer}>
          <EmailButton href={rsvpUrl} ariaLabel={`RSVP for ${eventName}`}>
            RSVP Now
          </EmailButton>
          <Text style={fallbackUrl}>
            Can't click the button? Copy this link: {rsvpUrl}
          </Text>
        </Section>

        {/* Invite Code */}
        <Section style={codeSection}>
          <Text style={codeLabel}>Your Invite Code:</Text>
          <Text style={codeValue}>{inviteCode}</Text>
        </Section>

        {/* QR Code */}
        {qrImageUrl && (
          <Section style={qrSection}>
            <Text style={qrLabel}>Show this at check-in:</Text>
            <Img
              src={qrImageUrl}
              alt={`QR code for ${eventName} RSVP`}
              style={qrImage}
            />
          </Section>
        )}

        {/* Helpful Links */}
        {(travelUrl || registryUrl || addToCalendarUrl) && (
          <Section style={linksSection}>
            <Text style={linksTitle}>Helpful Links:</Text>
            {addToCalendarUrl && (
              <Text style={linkItem}>
                <Link href={addToCalendarUrl} style={linkStyle}>
                  📅 Add to Calendar
                </Link>
              </Text>
            )}
            {travelUrl && (
              <Text style={linkItem}>
                <Link href={travelUrl} style={linkStyle}>
                  ✈️ Travel & Stay
                </Link>
              </Text>
            )}
            {registryUrl && (
              <Text style={linkItem}>
                <Link href={registryUrl} style={linkStyle}>
                  🎁 Registry
                </Link>
              </Text>
            )}
          </Section>
        )}

        <Text style={paragraph}>
          Please RSVP by clicking the button above or visiting our website.
          We can't wait to celebrate with you!
        </Text>

        <Text style={paragraph}>
          With love and excitement,<br />
          Brenda & Diamond
        </Text>
      </Section>

      {/* Footer */}
      <Footer 
        websiteUrl="https://brendabagsherdiamond.com"
        contactEmail={contactEmail}
        replyToEmail={replyToEmail}
      />
    </BaseEmailLayout>
  )
}

// Subject helper
export function getInvitationSubject(guestName: string, eventName: string): string {
  return `You're Invited, ${guestName} — ${eventName}`
}

// Plain text renderer
export function renderPlainText(invitation: InvitationEmailProps): string {
  const lines = [
    'Brenda & Diamond — Invitation',
    '',
    `Dear ${invitation.guestName},`,
    '',
    invitation.eventName,
    invitation.eventDate,
    invitation.eventVenue,
    invitation.eventAddress || '',
    '',
    `RSVP: ${invitation.rsvpUrl}`,
    `Invite Code: ${invitation.inviteCode}`,
    invitation.qrImageUrl ? `QR: ${invitation.qrImageUrl}` : '',
    '',
    'Links:',
    invitation.addToCalendarUrl || '',
    invitation.travelUrl || '',
    invitation.registryUrl || '',
    invitation.contactEmail || '',
    '',
    "We can't wait to celebrate with you.",
  ]
  
  return lines.filter(line => line.trim()).join('\n')
}

// Styles
const header = {
  backgroundColor: '#FFFFFF',
  padding: '40px 20px',
  textAlign: 'center' as const,
}

const headerTitle = {
  color: '#111111',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  letterSpacing: '1px',
}

const headerSubtitle = {
  color: '#C7A049',
  fontSize: '18px',
  margin: '0 0 20px 0',
  fontWeight: '300',
  letterSpacing: '2px',
}

const headerRule = {
  borderColor: '#C7A049',
  borderWidth: '2px',
  borderStyle: 'solid',
  margin: '0',
  width: '60px',
}

const heroSection = {
  textAlign: 'center' as const,
  padding: '0 20px',
}

const heroImage = {
  maxWidth: '100%',
  height: 'auto',
  borderRadius: '8px',
}

const content = {
  backgroundColor: '#FFFFFF',
  padding: '40px 20px',
}

const greeting = {
  color: '#111111',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
  fontFamily: "'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
}

const paragraph = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px 0',
}

const eventCard = {
  backgroundColor: '#FFFFFF',
  border: '2px solid #C7A049',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const eventTitle = {
  color: '#111111',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const fallbackUrl = {
  color: '#666666',
  fontSize: '14px',
  margin: '16px 0 0 0',
  fontFamily: 'monospace',
  wordBreak: 'break-all' as const,
}

const codeSection = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #EFE7D7',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const codeLabel = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 8px 0',
  fontWeight: '500',
}

const codeValue = {
  color: '#111111',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
  fontFamily: 'monospace',
  letterSpacing: '2px',
}

const qrSection = {
  textAlign: 'center' as const,
  margin: '24px 0',
}

const qrLabel = {
  color: '#666666',
  fontSize: '14px',
  margin: '0 0 12px 0',
  fontWeight: '500',
}

const qrImage = {
  maxWidth: '150px',
  height: 'auto',
  border: '1px solid #C7A049',
  borderRadius: '4px',
  padding: '8px',
}

const linksSection = {
  backgroundColor: '#FFFFFF',
  border: '1px solid #EFE7D7',
  borderRadius: '6px',
  padding: '20px',
  margin: '24px 0',
}

const linksTitle = {
  color: '#111111',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px 0',
}

const linkItem = {
  margin: '0 0 8px 0',
}

const linkStyle = {
  color: '#C7A049',
  textDecoration: 'underline',
  fontSize: '16px',
}

export default InvitationEmail