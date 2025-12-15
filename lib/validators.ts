import { z } from 'zod'

export const guestSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().max(50, 'Last name too long').optional().or(z.literal('')),
  email: z.string().email('Invalid email address').max(100, 'Email too long').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  household_id: z.string().optional(),
  household_name: z.string().optional(),
  is_vip: z.boolean().default(false),
  gender: z.enum(['male', 'female', 'other']).optional(),
  total_guests: z.number().int().min(1).max(20).optional(),
})

// CSV columns provided: Timestamp, Gender, First Name, Last Name, Email, Phone Number, Total Guests, Household Name
// Note: Column names are matched case-insensitively and with flexible spacing
export const csvGuestSchema = z.preprocess((data: any) => {
  // Normalize column names - handle case-insensitive matching and spacing variations
  if (typeof data !== 'object' || data === null) return data
  
  const normalized: any = {}
  const columnMap: Record<string, string> = {
    'timestamp': 'Timestamp',
    'first name': 'First Name',
    'firstname': 'First Name',
    'first_name': 'First Name',
    'last name': 'Last Name',
    'lastname': 'Last Name',
    'last_name': 'Last Name',
    'email': 'Email',
    'phone number': 'Phone Number',
    'phonenumber': 'Phone Number',
    'phone_number': 'Phone Number',
    'phone': 'Phone Number',
    'gender': 'Gender',
    'total guests': 'Total Guests',
    'totalguests': 'Total Guests',
    'total_guests': 'Total Guests',
    'household name': 'Household Name',
    'householdname': 'Household Name',
    'household_name': 'Household Name',
  }
  
  // Map all keys to normalized names
  Object.keys(data).forEach(key => {
    const normalizedKey = columnMap[key.toLowerCase().trim()] || key
    normalized[normalizedKey] = data[key]
  })
  
  return normalized
}, z.object({
  Timestamp: z.string().optional(),
  Gender: z.string().optional(),
  'First Name': z.string().trim().min(1, 'First name is required'),
  'Last Name': z.string().trim().optional().or(z.literal('')),
  Email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  'Phone Number': z.string().trim().optional().or(z.literal('')),
  'Total Guests': z.string().trim().optional(),
  'Household Name': z.string().trim().optional().or(z.literal('')),
})).transform((row) => {
  const genderRaw = (row.Gender || '').trim().toLowerCase()
  const gender = genderRaw === 'male' || genderRaw === 'm'
    ? 'male'
    : genderRaw === 'female' || genderRaw === 'f'
    ? 'female'
    : genderRaw
      ? 'other'
      : undefined
  
  // Parse Total Guests - convert string to number if present
  let totalGuests: number | undefined = undefined
  if (row['Total Guests']) {
    const parsed = parseInt(row['Total Guests'].trim(), 10)
    if (!isNaN(parsed) && parsed >= 1 && parsed <= 20) {
      totalGuests = parsed
    }
  }
  
  return {
    first_name: (row['First Name'] || '').trim(),
    last_name: row['Last Name'] && row['Last Name'].trim() ? row['Last Name'].trim() : undefined,
    email: row.Email && row.Email.trim() ? row.Email.trim() : undefined,
    phone: row['Phone Number'] || '',
    gender,
    total_guests: totalGuests,
    household_name: row['Household Name'] || undefined,
  }
})

export const paginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(100).default(20),
})

export const guestFiltersSchema = z.object({
  search: z.string().optional(),
  rsvp_status: z.enum(['pending', 'accepted', 'declined', 'waitlist']).optional(),
  is_vip: z.boolean().optional(),
  sort_by: z.enum(['name', 'updated_at', 'status']).default('name'),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
})

export const invitationSchema = z.object({
  event_id: z.string().min(1, 'Event is required'),
  headcount: z.number().int().min(1).max(20).default(1),
})

export const backfillInviteCodesSchema = z.object({
  dryRun: z.boolean().default(true),
  batchSize: z.number().int().min(50).max(5000).default(500),
  maxRetries: z.number().int().min(1).max(10).default(5),
})

// Invitation schemas
export const invitationEventSchema = z.object({
  event_id: z.string().min(1, 'Event is required'),
  headcount: z.number().int().min(1).max(20).default(1),
  status: z.enum(['pending', 'accepted', 'declined', 'waitlist']).default('pending'),
})

export const createInvitationSchema = z.object({
  guest_ids: z.array(z.string().uuid()).min(1, 'At least one guest is required'),
  events: z.array(invitationEventSchema).min(1, 'At least one event is required'),
})

export const updateInvitationSchema = z.object({
  guest_id: z.string().uuid().optional(),
  events: z.array(invitationEventSchema).optional(),
})

export const invitationFiltersSchema = z.object({
  q: z.string().optional(),
  eventId: z.string().optional(),
  status: z.enum(['pending', 'accepted', 'declined', 'waitlist']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.object({
    column: z.string().default('created_at'),
    direction: z.enum(['asc', 'desc']).default('desc'),
  }).optional(),
})

export const csvInvitationSchema = z.object({
  guest_email: z.string().email('Invalid email address'),
  guest_first_name: z.string().optional(),
  guest_last_name: z.string().optional(),
  event_id: z.string().min(1, 'Event ID is required'),
  headcount: z.number().int().min(1).max(20).default(1),
  status: z.enum(['pending', 'accepted', 'declined', 'waitlist']).default('pending'),
})

export const sendEmailSchema = z.object({
  invitationId: z.string().uuid(),
  eventIds: z.array(z.string().uuid()).min(1, 'At least one event must be selected'),
  to: z.string().email().optional(),
  includeQr: z.boolean().default(true),
  ignoreRateLimit: z.boolean().default(false),
})

// Event schemas
export const eventSchema = z.object({
  name: z.string().min(1, 'Event name is required').max(100, 'Event name too long'),
  venue: z.string().min(1, 'Venue is required').max(200, 'Venue name too long'),
  address: z.string().optional().or(z.literal('')),
  starts_at: z.string().min(1, 'Start date and time is required'),
  icon: z.string().optional(),
  picture_url: z.string().url().optional().or(z.literal('')),
})

export const createEventSchema = eventSchema

export const updateEventSchema = eventSchema.partial()

// Configuration schemas
export const updateConfigSchema = z.object({
  plus_ones_enabled: z.boolean().optional(),
  max_party_size: z.number().int().min(1).max(20).optional(),
  allow_guest_plus_ones: z.boolean().optional(),
  rsvp_enabled: z.boolean().optional(),
  rsvp_cutoff_date: z.string().optional(),
  rsvp_cutoff_timezone: z.string().optional(),
  access_code_enabled: z.boolean().optional(),
  access_code_required_seating: z.boolean().optional(),
  access_code_required_schedule: z.boolean().optional(),
  access_code_required_event_details: z.boolean().optional(),
  food_choices_enabled: z.boolean().optional(),
  food_choices_required: z.boolean().optional(),
  dress_code_message: z.string().optional(),
  age_restriction_message: z.string().optional(),
  rsvp_footer: z.string().optional(),
  registry_empty_message: z.string().optional(),
  // Notification channel settings
  notification_email_enabled: z.boolean().optional(),
  notification_whatsapp_enabled: z.boolean().optional(),
  notification_sms_enabled: z.boolean().optional(),
})

// RSVP schemas
const rsvpGuestSchema = z.object({
  name: z.string().max(255, 'Guest name too long').optional(),
  food_choice: z.string().max(100, 'Food choice too long'),
})

export const rsvpSchema = z.object({
  invite_code: z.string().min(1, 'Invite code is required').max(20, 'Invite code too long'),
  response: z.enum(['accepted', 'declined'], {
    message: 'Response must be either accepted or declined'
  }),
  party_size: z.number().int().min(1).max(20).optional(),
  email: z.string().email('Invalid email address').max(100, 'Email too long').optional(),
  phone: z.string().max(20, 'Phone number too long').optional(),
  preferred_channel: z.enum(['email', 'sms', 'whatsapp']).optional(),
  goodwill_message: z.string().max(500, 'Goodwill message too long').optional(),
  dietary_restrictions: z.string().max(500, 'Dietary restrictions too long').optional(),
  dietary_information: z.string().max(500, 'Dietary information too long').optional(),
  food_choice: z.string().max(100, 'Food choice too long').optional(), // Keep for backward compatibility
  guests: z.array(rsvpGuestSchema).optional(), // Array of guest food choices
})

export const rsvpConfirmationEmailSchema = z.object({
  to: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().min(1, 'Text content is required'),
  meta: z.object({
    invitationId: z.string().uuid(),
    rsvpUrl: z.string().url(),
    guestName: z.string().min(1),
    inviteCode: z.string().min(1),
    events: z.array(z.object({
      name: z.string(),
      startsAtISO: z.string(),
      venue: z.string(),
      address: z.string().optional(),
    })),
  }),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string(),
    contentType: z.string(),
  })).optional(),
})

export type GuestInput = z.infer<typeof guestSchema>
export type CsvGuestInput = z.infer<typeof csvGuestSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type GuestFiltersInput = z.infer<typeof guestFiltersSchema>
export type InvitationInput = z.infer<typeof invitationSchema>
export type BackfillInviteCodesInput = z.infer<typeof backfillInviteCodesSchema>
export type InvitationEventInput = z.infer<typeof invitationEventSchema>
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>
export type UpdateInvitationInput = z.infer<typeof updateInvitationSchema>
export type InvitationFiltersInput = z.infer<typeof invitationFiltersSchema>
export type CsvInvitationInput = z.infer<typeof csvInvitationSchema>
export type SendEmailInput = z.infer<typeof sendEmailSchema>
export type EventInput = z.infer<typeof eventSchema>
export type CreateEventInput = z.infer<typeof createEventSchema>
export type UpdateEventInput = z.infer<typeof updateEventSchema>
export type UpdateConfigInput = z.infer<typeof updateConfigSchema>
export type RsvpInput = z.infer<typeof rsvpSchema>
export type RsvpConfirmationEmailInput = z.infer<typeof rsvpConfirmationEmailSchema>
