'use server'

import { submitRsvp, type RsvpResult } from '@/lib/rsvp-service'
import { rsvpSchema, type RsvpInput } from '@/lib/validators'
import { headers } from 'next/headers'

export interface RsvpActionResult {
  success: boolean
  result?: RsvpResult
  message: string
  errors?: Record<string, string[]>
}

export async function submitRsvpAction(
  formData: FormData
): Promise<RsvpActionResult> {
  try {
    // Extract form data
    const inviteCode = formData.get('invite_code') as string
    const response = formData.get('response') as string
    const email = formData.get('email') as string
    const goodwillMessage = formData.get('goodwill_message') as string
    const dietaryRestrictions = formData.get('dietary_restrictions') as string
    const dietaryInformation = formData.get('dietary_information') as string
    const foodChoice = formData.get('food_choice') as string

    // Validate input
    const validationResult = rsvpSchema.safeParse({
      invite_code: inviteCode,
      response: response === 'accepted' ? 'accepted' : 'declined',
      email: email || undefined,
      goodwill_message: goodwillMessage || undefined,
      dietary_restrictions: dietaryRestrictions || undefined,
      dietary_information: dietaryInformation || undefined,
      food_choice: foodChoice || undefined,
    })

    if (!validationResult.success) {
      return {
        success: false,
        message: 'Please check your input and try again.',
        errors: validationResult.error.flatten().fieldErrors,
      }
    }

    // Get request metadata for audit logging
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || undefined
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : undefined

    // Submit RSVP
    const result = await submitRsvp(
      validationResult.data,
      undefined, // user_id (not available for public RSVP)
      ipAddress,
      userAgent
    )

    return result
  } catch (error) {
    console.error('Error in submitRsvpAction:', error)
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again.',
    }
  }
}
