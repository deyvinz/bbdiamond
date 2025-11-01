import { supabaseServer } from './supabase-server'

export interface SubscriptionPlan {
  id: string
  name: string
  description: string
  price_monthly: number
  price_yearly: number
  features: string[]
  max_guests: number
  max_events: number
  custom_domain: boolean
  white_label: boolean
  priority_support: boolean
}

export interface Customer {
  id: string
  email: string
  full_name: string | null
  subscription_status: 'trial' | 'active' | 'past_due' | 'cancelled'
  current_plan_id: string | null
  trial_ends_at: string | null
  subscription_ends_at: string | null
  stripe_customer_id: string | null
}

/**
 * Get all active subscription plans
 */
export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  const supabase = await supabaseServer()
  
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('is_active', true)
    .order('price_monthly', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch plans: ${error.message}`)
  }

  return data || []
}

/**
 * Get customer subscription details
 */
export async function getCustomerSubscription(customerId: string): Promise<Customer | null> {
  const supabase = await supabaseServer()
  
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Customer not found
    }
    throw new Error(`Failed to fetch customer: ${error.message}`)
  }

  return data
}

/**
 * Get customer's weddings
 */
export async function getCustomerWeddings(customerId: string) {
  const supabase = await supabaseServer()
  
  const { data, error } = await supabase
    .rpc('get_customer_weddings', { customer_uuid: customerId })

  if (error) {
    throw new Error(`Failed to fetch weddings: ${error.message}`)
  }

  return data || []
}

/**
 * Check if customer can create more weddings (based on plan limits)
 */
export async function canCreateWedding(customerId: string): Promise<boolean> {
  const customer = await getCustomerSubscription(customerId)
  if (!customer || !customer.current_plan_id) {
    return false
  }

  const supabase = await supabaseServer()
  
  // Get plan details
  const { data: plan } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', customer.current_plan_id)
    .single()

  if (!plan) return false

  // Enterprise plan allows unlimited
  if (plan.name === 'Enterprise') return true

  // Check current wedding count
  const weddings = await getCustomerWeddings(customerId)
  return weddings.length < (plan.max_guests || 1) // Use max_guests as wedding limit for now
}

/**
 * Update customer subscription
 */
export async function updateCustomerSubscription(
  customerId: string,
  planId: string,
  stripeSubscriptionId?: string
): Promise<void> {
  const supabase = await supabaseServer()
  
  const { error } = await supabase
    .from('customers')
    .update({
      current_plan_id: planId,
      subscription_status: 'active',
      stripe_subscription_id: stripeSubscriptionId || null,
      subscription_starts_at: new Date().toISOString(),
      subscription_ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
    })
    .eq('id', customerId)

  if (error) {
    throw new Error(`Failed to update subscription: ${error.message}`)
  }
}

