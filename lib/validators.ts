import { z } from 'zod'

export const guestSchema = z.object({
  first_name: z.string().min(1, 'First name is required').max(50, 'First name too long'),
  last_name: z.string().min(1, 'Last name is required').max(50, 'Last name too long'),
  email: z.string().email('Invalid email address').max(100, 'Email too long'),
  phone: z.string().optional().or(z.literal('')),
  household_id: z.string().optional(),
  household_name: z.string().optional(),
  is_vip: z.boolean().default(false),
  plus_ones_allowed: z.number().int().min(0).max(10).default(0),
  gender: z.enum(['male', 'female', 'other']).optional(),
})

// CSV columns provided: Timestamp, Gender, First Name, Last Name, Email, Phone Number
export const csvGuestSchema = z.object({
  Timestamp: z.string().optional(),
  Gender: z.string().optional(),
  'First Name': z.string().min(1, 'First name is required'),
  'Last Name': z.string().min(1, 'Last name is required'),
  Email: z.string().email('Invalid email address'),
  'Phone Number': z.string().optional().or(z.literal('')),
}).transform((row) => {
  const genderRaw = (row.Gender || '').trim().toLowerCase()
  const gender = genderRaw === 'male' || genderRaw === 'm'
    ? 'male'
    : genderRaw === 'female' || genderRaw === 'f'
    ? 'female'
    : genderRaw
      ? 'other'
      : undefined
  return {
    first_name: row['First Name'],
    last_name: row['Last Name'],
    email: row.Email,
    phone: row['Phone Number'] || '',
    gender,
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
