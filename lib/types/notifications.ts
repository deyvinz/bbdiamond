/**
 * Notification Types for multi-channel messaging (Email, WhatsApp, SMS)
 */

export type NotificationChannel = 'email' | 'whatsapp' | 'sms'

export interface NotificationConfig {
  notification_email_enabled: boolean
  notification_whatsapp_enabled: boolean
  notification_sms_enabled: boolean
}

export const DEFAULT_NOTIFICATION_CONFIG: NotificationConfig = {
  notification_email_enabled: true,
  notification_whatsapp_enabled: false,
  notification_sms_enabled: false,
}

export interface NotificationResult {
  channel: NotificationChannel
  success: boolean
  messageId?: string
  error?: string
  skipped?: boolean
  skipReason?: string
}

export interface SendNotificationOptions {
  invitationId: string
  eventIds: string[]
  channels?: NotificationChannel[] // Override config, send to specific channels only
  ignoreRateLimit?: boolean
}

export interface WhatsAppRegistrationStatus {
  phoneNumber: string
  isRegistered: boolean
  waId?: string
  checkedAt: Date
  cached: boolean
}

export interface SmsResult {
  success: boolean
  messageId?: string
  error?: string
}

export interface InvitationNotificationParams {
  guestName: string
  guestFirstName: string
  coupleName: string
  eventName: string
  eventDate: string
  eventTime: string
  venue: string
  address?: string
  rsvpUrl: string
  inviteCode: string
  websiteUrl: string
}
