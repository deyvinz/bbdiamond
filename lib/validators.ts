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

export type GuestInput = z.infer<typeof guestSchema>
export type CsvGuestInput = z.infer<typeof csvGuestSchema>
export type PaginationInput = z.infer<typeof paginationSchema>
export type GuestFiltersInput = z.infer<typeof guestFiltersSchema>
export type InvitationInput = z.infer<typeof invitationSchema>
