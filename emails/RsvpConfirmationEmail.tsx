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

export interface RsvpConfirmationEmailProps {
  guestName: string
  inviteCode: string
  rsvpUrl: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
  }>
  isAccepted: boolean
  goodwillMessage?: string
  qrImageUrl?: string
  digitalPassUrl?: string
  contactEmail?: string
  replyToEmail?: string
  coupleDisplayName?: string
  websiteUrl?: string
}

export function RsvpConfirmationEmail({
  guestName,
  inviteCode,
  rsvpUrl,
  events,
  isAccepted,
  goodwillMessage,
  qrImageUrl,
  digitalPassUrl,
  contactEmail,
  replyToEmail,
  coupleDisplayName = 'Wedding Celebration',
  websiteUrl,
}: RsvpConfirmationEmailProps) {
  const preheaderText = isAccepted 
    ? `RSVP Confirmed — You're on the list!`
    : `Thank you for your response`

  const formatEventDateTime = (startsAtISO: string) => {
    // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
    const [datePart, timePart] = startsAtISO.split(' ')
    const [year, month, day] = datePart.split('-')
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })

    let eventTime = '00:00 AM'
    if (timePart) {
      const [hourStr, minuteStr] = timePart.split(':')
      let hour = parseInt(hourStr, 10)
      const minute = minuteStr ? minuteStr.padStart(2, '0') : '00'
      const ampm = hour >= 12 ? 'PM' : 'AM'
      hour = hour % 12 || 12 // Convert 0/12/24 to 12-hour format
      eventTime = `${hour}:${minute} ${ampm}`
    } // Extract HH:MM
    const formattedEventDateTime = `${eventDate} · ${eventTime}`
    return formattedEventDateTime
  }

  return (
    <BaseEmailLayout preheader={preheaderText}>
      {/* Header */}
      <Section style={header}>
        <Img
          src="https://brendabagsherdiamond.com/images/logo.png"
          alt="Brenda & Diamond Wedding"
          style={logoImage}
        />
        <Text style={headerSubtitle}>Wedding Celebration</Text>
        <Hr style={headerRule} />
      </Section>

      {/* Main Content */}
      <Section style={content}>
        <Text style={greeting}>Dear {guestName},</Text>
        
        {isAccepted ? (
          <>
            <Text style={paragraph}>
              <strong>You're confirmed! ✨</strong> We're so excited that you'll be joining us for our special day.
            </Text>

            <Text style={paragraph}>
              We've emailed your confirmation details, QR code, and digital access pass. 
              Please keep this information handy for the celebration.
            </Text>

            {/* Confirmed Events */}
            <Section style={eventsSection}>
              <SectionHeading level={2}>
                Your Confirmed Events
              </SectionHeading>
              
              {events.map((event, index) => {
                const eventMapUrl = event.address 
                  ? `https://maps.google.com/maps?q=${encodeURIComponent(event.address)}` 
                  : undefined
                
                return (
                  <Section key={index} style={eventCard}>
                    <Text style={eventTitle}>{event.name}</Text>
                    
                    <InfoRow 
                      label="📅 Date & Time:" 
                      value={formatEventDateTime(event.startsAtISO)} 
                    />
                    <InfoRow 
                      label="📍 Venue:" 
                      value={event.venue}
                      href={eventMapUrl}
                    />
                    {event.address && (
                      <InfoRow 
                        label="🏠 Address:" 
                        value={event.address}
                        href={eventMapUrl}
                      />
                    )}
                  </Section>
                )
              })}
            </Section>

            {/* QR Code */}
            {qrImageUrl && (
              <Section style={qrSection}>
                <Text style={qrLabel}>Show this QR code at check-in:</Text>
                <Img
                  src={qrImageUrl}
                  alt={`QR code for ${guestName}'s RSVP`}
                  style={qrImage}
                />
              </Section>
            )}

            {/* Digital Pass */}
            {digitalPassUrl && (
              <Section style={passSection}>
                <Text style={passLabel}>Your Digital Access Pass:</Text>
                <EmailButton href={digitalPassUrl} ariaLabel="View Digital Access Pass">
                  View Access Pass
                </EmailButton>
                <Text style={passDescription}>
                  Save this pass to your phone or print it out for easy access to all events.
                </Text>
              </Section>
            )}

            {/* RSVP Link */}
            <Section style={buttonContainer}>
              <EmailButton href={rsvpUrl} ariaLabel="View RSVP Details">
                View RSVP Details
              </EmailButton>
            </Section>
          </>
        ) : (
          <>
            <Text style={paragraph}>
              Thank you for letting us know that you won't be able to join us. 
              We'll miss you, but we completely understand.
            </Text>

            {goodwillMessage && (
              <Section style={messageSection}>
                <Text style={messageLabel}>Your message to the couple:</Text>
                <Text style={messageContent}>"{goodwillMessage}"</Text>
              </Section>
            )}

            <Text style={paragraph}>
              We hope to celebrate with you in other ways soon. 
              Thank you for being part of our lives and for your kind words.
            </Text>

            <Text style={paragraph}>
              With love and appreciation,<br />
              {coupleDisplayName}
            </Text>
          </>
        )}

        {/* Invite Code */}
        <Section style={codeSection}>
          <Text style={codeLabel}>Your Invite Code:</Text>
          <Text style={codeValue}>{inviteCode}</Text>
        </Section>

        {isAccepted && (
          <Text style={paragraph}>
            We can't wait to celebrate with you! If you have any questions, 
            please don't hesitate to reach out.
          </Text>
        )}
      </Section>

      {/* Footer */}
      <Footer 
        websiteUrl={websiteUrl || rsvpUrl.split('/rsvp')[0] || "http://luwani.com/demo"}
        contactEmail={contactEmail}
        replyToEmail={replyToEmail}
      />
    </BaseEmailLayout>
  )
}

// Subject helper
export function getRsvpConfirmationSubject(guestName: string, isAccepted: boolean): string {
  return isAccepted 
    ? `RSVP Confirmed — You're on the list, ${guestName}!`
    : `Thank you for your response, ${guestName}`
}

// Plain text renderer
export function renderRsvpConfirmationText(props: RsvpConfirmationEmailProps): string {
  const { guestName, inviteCode, rsvpUrl, events, isAccepted, goodwillMessage, coupleDisplayName = 'Wedding Celebration', websiteUrl, contactEmail } = props
  const baseUrl = websiteUrl || rsvpUrl.split('/rsvp')[0] || 'http://luwani.com/demo'
  
  const formatEventDateTime = (startsAtISO: string) => {
    // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
    const [datePart, timePart] = startsAtISO.split(' ')
    const [year, month, day] = datePart.split('-')
    const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    let eventTime = '00:00 AM'
    if (timePart) {
      const [hourStr, minuteStr] = timePart.split(':')
      let hour = parseInt(hourStr, 10)
      const minute = minuteStr ? minuteStr.padStart(2, '0') : '00'
      const ampm = hour >= 12 ? 'PM' : 'AM'
      hour = hour % 12 || 12 // Convert 0/12/24 to 12-hour format
      eventTime = `${hour}:${minute} ${ampm}`
    } // Extract HH:MM
    const formattedEventDateTime = `${eventDate} · ${eventTime}`
    return formattedEventDateTime
  }

  const lines = [
    `${coupleDisplayName} — RSVP Confirmation`,
    '',
    `Dear ${guestName},`,
    '',
  ]

  if (isAccepted) {
    lines.push(
      'You\'re confirmed! ✨ We\'re so excited that you\'ll be joining us for our special day.',
      '',
      'Your Confirmed Events:',
      ...events.map(event => [
        event.name,
        formatEventDateTime(event.startsAtISO),
        event.venue,
        event.address || '',
        ''
      ]).flat(),
      `RSVP Details: ${rsvpUrl}`,
      `Invite Code: ${inviteCode}`,
      '',
      'We can\'t wait to celebrate with you!'
    )
  } else {
    lines.push(
      'Thank you for letting us know that you won\'t be able to join us.',
      'We\'ll miss you, but we completely understand.',
      ''
    )
    
    if (goodwillMessage) {
      lines.push(
        'Your message to the couple:',
        `"${goodwillMessage}"`,
        ''
      )
    }
    
    lines.push(
      'We hope to celebrate with you in other ways soon.',
      'Thank you for being part of our lives.',
      '',
      'With love and appreciation,',
      coupleDisplayName
    )
  }

  lines.push(
    '',
    `Visit our website: ${baseUrl}`,
    contactEmail ? `Questions? Contact us at ${contactEmail}` : ''
  )
  
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

const logoImage = {
  maxWidth: '200px',
  height: 'auto',
  margin: '0 auto 16px auto',
  display: 'block',
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

const eventsSection = {
  margin: '32px 0',
}

const eventCard = {
  backgroundColor: '#FFFFFF',
  border: '2px solid #C7A049',
  borderRadius: '8px',
  padding: '24px',
  margin: '16px 0',
}

const eventTitle = {
  color: '#111111',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

const qrSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
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

const passSection = {
  textAlign: 'center' as const,
  margin: '32px 0',
  backgroundColor: '#f8f9fa',
  border: '1px solid #EFE7D7',
  borderRadius: '8px',
  padding: '24px',
}

const passLabel = {
  color: '#111111',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
}

const passDescription = {
  color: '#666666',
  fontSize: '14px',
  margin: '16px 0 0 0',
}

const messageSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #EFE7D7',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
}

const messageLabel = {
  color: '#111111',
  fontSize: '14px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
}

const messageContent = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0',
  fontStyle: 'italic',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
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

export default RsvpConfirmationEmail
