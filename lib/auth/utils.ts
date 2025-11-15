import { supabaseServer } from '../supabase-server'
import { verifyWeddingOwnership } from './wedding-access'

/**
 * Get the current authenticated user
 * @returns User object if authenticated, null otherwise
 */
export async function getAuthUser() {
  try {
    const supabase = await supabaseServer()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('Error getting auth user:', error)
    return null
  }
}

/**
 * Require authentication, throw error if not authenticated
 * @throws Error if user is not authenticated
 * @returns User object if authenticated
 */
export async function requireAuth() {
  const user = await getAuthUser()
  
  if (!user) {
    throw new Error('Authentication required')
  }
  
  return user
}

/**
 * Get customer ID from auth user ID
 * Since customer.id references auth.users(id), they should be the same
 * But this function can be used to verify the customer record exists
 * @param userId - The auth user ID (optional, defaults to current user)
 * @returns Customer ID if exists, null otherwise
 */
export async function getUserCustomerId(userId?: string): Promise<string | null> {
  try {
    const supabase = await supabaseServer()
    
    // If no userId provided, get current user
    if (!userId) {
      const user = await getAuthUser()
      if (!user) {
        return null
      }
      userId = user.id
    }
    
    // Check if customer record exists
    const { data, error } = await supabase
      .from('customers')
      .select('id')
      .eq('id', userId)
      .single()
    
    if (error || !data) {
      return null
    }
    
    return data.id
  } catch (error) {
    console.error('Error getting customer ID:', error)
    return null
  }
}

/**
 * Check if user has access to a wedding
 * @param userId - The auth user ID (optional, defaults to current user)
 * @param weddingId - The wedding ID to check
 * @returns true if user has access, false otherwise
 */
export async function checkWeddingAccess(
  weddingId: string,
  userId?: string
): Promise<boolean> {
  try {
    // If no userId provided, get current user
    let finalUserId: string
    if (!userId) {
      const user = await getAuthUser()
      if (!user) {
        return false
      }
      finalUserId = user.id
    } else {
      finalUserId = userId
    }
    
    return await verifyWeddingOwnership(finalUserId, weddingId)
  } catch (error) {
    console.error('Error checking wedding access:', error)
    return false
  }
}

