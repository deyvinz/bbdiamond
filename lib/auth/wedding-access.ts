import { supabaseService } from '../supabase-service'

/**
 * Verify if a user (customer) owns a specific wedding
 * @param userId - The auth user ID (should match customer.id)
 * @param weddingId - The wedding ID to check
 * @returns true if user owns the wedding, false otherwise
 */
export async function verifyWeddingOwnership(
  userId: string,
  weddingId: string
): Promise<boolean> {
  try {
    const supabase = supabaseService()

    // Check if user is a customer and owns this wedding
    const { data, error } = await supabase
      .from('wedding_owners')
      .select('wedding_id')
      .eq('wedding_id', weddingId)
      .eq('customer_id', userId)
      .single()

    if (error || !data) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error verifying wedding ownership:', error)
    return false
  }
}

/**
 * Get all weddings owned by a user (customer)
 * @param userId - The auth user ID (should match customer.id)
 * @returns Array of wedding IDs owned by the user
 */
export async function getUserWeddings(userId: string): Promise<string[]> {
  try {
    const supabase = supabaseService()

    const { data, error } = await supabase
      .from('wedding_owners')
      .select('wedding_id')
      .eq('customer_id', userId)

    if (error || !data) {
      return []
    }

    return data.map((row) => row.wedding_id)
  } catch (error) {
    console.error('Error getting user weddings:', error)
    return []
  }
}

/**
 * Require that a user has access to a wedding, throw error if not
 * @param userId - The auth user ID
 * @param weddingId - The wedding ID to check
 * @throws Error if user does not own the wedding
 */
export async function requireWeddingAccess(
  userId: string,
  weddingId: string
): Promise<void> {
  const hasAccess = await verifyWeddingOwnership(userId, weddingId)
  if (!hasAccess) {
    throw new Error('Access denied: You do not have permission to access this wedding')
  }
}

/**
 * Get customer ID from auth user ID
 * Since customer.id references auth.users(id), they should be the same
 * But this function can be used to verify the customer record exists
 * @param userId - The auth user ID
 * @returns Customer ID if exists, null otherwise
 */
export async function getCustomerId(userId: string): Promise<string | null> {
  try {
    const supabase = supabaseService()

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

