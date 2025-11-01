'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { CreditCard, Calendar, Check, AlertCircle } from 'lucide-react'

export default function BillingPage() {
  const router = useRouter()
  const [customer, setCustomer] = useState<any>(null)
  const [plan, setPlan] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBillingData()
  }, [])

  const loadBillingData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/sign-in')
        return
      }

      // Get customer data
      const { data: customerData } = await supabase
        .from('customers')
        .select('*')
        .eq('id', user.id)
        .single()

      setCustomer(customerData)

      // Get plan details
      if (customerData?.current_plan_id) {
        const { data: planData } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('id', customerData.current_plan_id)
          .single()

        setPlan(planData)
      }
    } catch (error) {
      console.error('Error loading billing data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-gold-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  const isTrial = customer?.subscription_status === 'trial'
  const isActive = customer?.subscription_status === 'active'

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gold-50/30 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Billing & Subscription</h1>
          <p className="text-muted-foreground">
            Manage your subscription and billing information
          </p>
        </div>

        {/* Current Plan */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold mb-2">
                Current Plan: {plan?.name || 'No Plan'}
              </h2>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  isTrial
                    ? 'bg-blue-100 text-blue-800'
                    : isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {isTrial ? 'Free Trial' : isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              {plan && (
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-bold">${plan.price_monthly}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              )}
            </div>
            <Button variant="outline">Upgrade Plan</Button>
          </div>

          {isTrial && customer?.trial_ends_at && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-semibold text-blue-900">Free Trial Active</p>
                <p className="text-sm text-blue-700">
                  Your trial ends on {new Date(customer.trial_ends_at).toLocaleDateString()}.
                  Add a payment method to continue after the trial.
                </p>
              </div>
            </div>
          )}

          {plan && (
            <div className="mt-6">
              <h3 className="font-semibold mb-3">Plan Features</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {plan.features?.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-gold-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Payment Method */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-gold-600" />
              <div>
                <h2 className="text-xl font-semibold">Payment Method</h2>
                <p className="text-sm text-muted-foreground">
                  Manage your payment information
                </p>
              </div>
            </div>
            <Button variant="outline">Update Payment</Button>
          </div>

          {customer?.payment_method_id ? (
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Payment method on file •••• •••• •••• 4242
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                No payment method on file. Add one to continue after your trial ends.
              </p>
            </div>
          )}
        </Card>

        {/* Billing History */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Billing History</h2>
          <div className="space-y-4">
            {/* Placeholder for payment transactions */}
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No billing history yet</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

