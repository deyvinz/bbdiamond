'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { Plus, Settings, ExternalLink, Calendar, Users, Mail } from 'lucide-react'

interface Wedding {
  id: string
  couple_display_name: string
  slug: string
  primary_date: string
  status: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [weddings, setWeddings] = useState<Wedding[]>([])
  const [loading, setLoading] = useState(true)
  const [customer, setCustomer] = useState<any>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
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

      // Get customer's weddings
      const { data: weddingsData, error } = await supabase
        .rpc('get_customer_weddings', { customer_uuid: user.id })

      if (error) throw error
      setWeddings(weddingsData || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gold-50/30 py-12 px-4">
      <div className="container max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back, {customer?.full_name || 'there'}!
            </p>
          </div>
          <Link href="/onboarding">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Wedding
            </Button>
          </Link>
        </div>

        {/* Subscription Status */}
        {customer && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-gold-50 to-gold-100 border-gold-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold mb-1">
                  {customer.subscription_status === 'trial' ? 'Free Trial' : 'Active Subscription'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {customer.subscription_status === 'trial' && customer.trial_ends_at
                    ? `Trial ends ${new Date(customer.trial_ends_at).toLocaleDateString()}`
                    : 'Your subscription is active'}
                </p>
              </div>
              <Link href="/dashboard/billing">
                <Button variant="outline">Manage Subscription</Button>
              </Link>
            </div>
          </Card>
        )}

        {/* Weddings Grid */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Your Weddings</h2>
          {weddings.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="text-4xl mb-4">💒</div>
              <h3 className="text-xl font-semibold mb-2">No weddings yet</h3>
              <p className="text-muted-foreground mb-6">
                Create your first wedding website to get started
              </p>
              <Link href="/onboarding">
                <Button>Create Your First Wedding</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {weddings.map((wedding) => (
                <Card key={wedding.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        {wedding.couple_display_name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(wedding.primary_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Active
                    </span>
                  </div>

                  <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {new Date(wedding.primary_date).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ExternalLink className="h-4 w-4" />
                      {wedding.slug}.weddingplatform.com
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/admin?wedding_id=${wedding.id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </Link>
                    <a
                      href={`https://${wedding.slug}.weddingplatform.com`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1"
                    >
                      <Button variant="default" className="w-full" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Site
                      </Button>
                    </a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mt-12 grid md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-100 rounded-lg">
                <Users className="h-6 w-6 text-gold-600" />
              </div>
              <div>
                <h3 className="font-semibold">Need Help?</h3>
                <p className="text-sm text-muted-foreground">Visit our help center</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-100 rounded-lg">
                <Mail className="h-6 w-6 text-gold-600" />
              </div>
              <div>
                <h3 className="font-semibold">Contact Support</h3>
                <p className="text-sm text-muted-foreground">Get assistance when you need it</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold-100 rounded-lg">
                <Settings className="h-6 w-6 text-gold-600" />
              </div>
              <div>
                <h3 className="font-semibold">Account Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your account</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}

