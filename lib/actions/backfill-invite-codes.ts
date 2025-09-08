'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import { backfillInviteCodes, BackfillResult } from '@/lib/guests-service-server'
import { backfillInviteCodesSchema } from '@/lib/validators'
import { acquireLock, releaseLock } from '@/lib/kv'
import { logInviteCodeBackfill } from '@/lib/audit'

export async function runBackfillInviteCodesAction(formData: FormData) {
  // Verify admin access
  const supabase = await supabaseServer()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/sign-in')
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Unauthorized: Admin access required')
  }

  // Parse and validate input
  const rawData = {
    dryRun: formData.get('dryRun') === 'true',
    batchSize: parseInt(formData.get('batchSize') as string) || 500,
    maxRetries: parseInt(formData.get('maxRetries') as string) || 5,
  }

  const validatedData = backfillInviteCodesSchema.parse(rawData)

  // Get request info for audit logging
  const headersList = await headers()
  const ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  // Acquire lock to prevent concurrent runs
  const lockKey = 'invite_code_backfill'
  const lockAcquired = await acquireLock(lockKey, 300) // 5 minutes TTL

  if (!lockAcquired) {
    throw new Error('Another backfill is currently running. Please try again in a few minutes.')
  }

  try {
    // Run the backfill
    const result: BackfillResult = await backfillInviteCodes(validatedData)

    // Log audit action
    await logInviteCodeBackfill(
      validatedData.batchSize,
      validatedData.dryRun,
      result.updated,
      result.skipped,
      result.conflictsResolved,
      user.id,
      ipAddress,
      userAgent
    )

    // Revalidate the admin guests page
    revalidatePath('/admin/guests')

    return {
      success: true,
      result,
      message: `Backfill completed: ${result.updated} codes generated, ${result.skipped} skipped, ${result.conflictsResolved} conflicts resolved.`
    }
  } catch (error) {
    console.error('Backfill error:', error)
    throw new Error(error instanceof Error ? error.message : 'Backfill failed')
  } finally {
    // Always release the lock
    await releaseLock(lockKey)
  }
}

export async function checkBackfillLockStatus() {
  const { isLockHeld } = await import('@/lib/kv')
  return await isLockHeld('invite_code_backfill')
}
