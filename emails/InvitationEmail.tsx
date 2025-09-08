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
  Button,
  Hr,
} from '@react-email/components'
import * as React from 'react'

interface InvitationEmailProps {
  guestName: string
  inviteCode: string
  rsvpUrl: string
  eventName: string
  eventDate: string
  eventTime: string
  eventVenue: string
  eventAddress?: string
  qrImageUrl?: string
}

export const InvitationEmail = ({
  guestName,
  inviteCode,
  rsvpUrl,
  eventName,
  eventDate,
  eventTime,
  eventVenue,
  eventAddress,
  qrImageUrl,
}: InvitationEmailProps) => {
  const previewText = `You're invited to ${eventName} - RSVP now!`

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={headerTitle}>Brenda & Diamond</Heading>
            <Text style={headerSubtitle}>Wedding Celebration</Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={greeting}>Dear {guestName},</Heading>
            
            <Text style={paragraph}>
              We are delighted to invite you to celebrate our special day with us!
            </Text>

            <Text style={paragraph}>
              Your presence would make our wedding celebration even more meaningful.
            </Text>

            {/* Event Details Card */}
            <Section style={eventCard}>
              <Heading style={eventTitle}>{eventName}</Heading>
              <Text style={eventDetail}>
                📅 <strong>Date:</strong> {eventDate}
              </Text>
              <Text style={eventDetail}>
                🕒 <strong>Time:</strong> {eventTime}
              </Text>
              <Text style={eventDetail}>
                📍 <strong>Venue:</strong> {eventVenue}
              </Text>
              {eventAddress && (
                <Text style={eventDetail}>
                  🏠 <strong>Address:</strong> {eventAddress}
                </Text>
              )}
            </Section>

            {/* RSVP Button */}
            <Section style={buttonContainer}>
              <Button style={rsvpButton} href={rsvpUrl}>
                RSVP Now
              </Button>
            </Section>

            {/* Invite Code */}
            <Section style={codeSection}>
              <Text style={codeLabel}>Your Invite Code:</Text>
              <Text style={codeValue}>{inviteCode}</Text>
            </Section>

            {/* QR Code */}
            {qrImageUrl && (
              <Section style={qrSection}>
                <Text style={qrLabel}>Scan to RSVP:</Text>
                <Img
                  src={qrImageUrl}
                  alt="QR Code for RSVP"
                  style={qrImage}
                />
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
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This invitation was sent to you for our wedding celebration.
              If you have any questions, please contact us.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main = {
  backgroundColor: '#f8f9fa',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#1a1a1a',
  padding: '40px 20px',
  textAlign: 'center' as const,
  borderRadius: '8px 8px 0 0',
}

const headerTitle = {
  color: '#ffffff',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0 0 8px 0',
  fontFamily: 'serif',
}

const headerSubtitle = {
  color: '#d4af37',
  fontSize: '18px',
  margin: '0',
  fontWeight: '300',
  letterSpacing: '2px',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '40px 20px',
  borderRadius: '0 0 8px 8px',
}

const greeting = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0 0 20px 0',
}

const paragraph = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 20px 0',
}

const eventCard = {
  backgroundColor: '#f8f9fa',
  border: '2px solid #d4af37',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 0',
}

const eventTitle = {
  color: '#1a1a1a',
  fontSize: '20px',
  fontWeight: 'bold',
  margin: '0 0 16px 0',
  textAlign: 'center' as const,
}

const eventDetail = {
  color: '#4a4a4a',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 8px 0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const rsvpButton = {
  backgroundColor: '#d4af37',
  borderRadius: '6px',
  color: '#1a1a1a',
  fontSize: '18px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '16px 32px',
  border: 'none',
  cursor: 'pointer',
}

const codeSection = {
  backgroundColor: '#f8f9fa',
  border: '1px solid #e0e0e0',
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
  color: '#1a1a1a',
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
}

const hr = {
  borderColor: '#e0e0e0',
  margin: '32px 0',
}

const footer = {
  textAlign: 'center' as const,
  padding: '20px 0',
}

const footerText = {
  color: '#666666',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

export default InvitationEmail
