'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/use-toast'
import { trackConversion } from '@/lib/analytics'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    plan: 'basic' // basic, premium, enterprise
  })

  useEffect(() => {
    trackConversion.signupStarted()
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('Failed to create user')
      }

      // 2. Create customer record
      const { error: customerError } = await supabase
        .from('customers')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          subscription_status: 'trial',
          current_plan_id: (
            await supabase
              .from('subscription_plans')
              .select('id')
              .eq('name', formData.plan === 'basic' ? 'Basic' : formData.plan === 'premium' ? 'Premium' : 'Enterprise')
              .single()
          ).data?.id,
          trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString() // 14 days
        })

      if (customerError) throw customerError

      // Track conversion
      trackConversion.signupCompleted(formData.plan)
      trackConversion.trialStarted(formData.plan)
      trackConversion.onboardingStarted()

      // 3. Redirect to onboarding
      toast({
        title: 'Account created!',
        description: 'Welcome! Let\'s set up your wedding website.',
      })

      router.push(`/onboarding?customer_id=${authData.user.id}`)
    } catch (error: any) {
      console.error('Signup error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create account',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-b from-background to-default-50">
      <Card className="w-full max-w-md border-0 shadow-2xl rounded-3xl overflow-hidden" radius="lg">
        <CardHeader className="text-center pb-0 bg-gradient-to-br from-primary-50 to-primary-100/50 pt-8">
          <div className="w-full">
            <h1 className="text-3xl font-serif font-bold mb-2 text-foreground">
              Create Your Account
            </h1>
            <p className="text-default-600">
              Start your 14-day free trial
            </p>
          </div>
        </CardHeader>
        <CardBody className="pt-8 pb-8 px-8">
          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="John & Sarah"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={8}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="At least 8 characters"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground">Must be at least 8 characters</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan">Choose a Plan *</Label>
              <Select
                value={formData.plan}
                onValueChange={(value) => setFormData({ ...formData, plan: value })}
              >
                <SelectTrigger id="plan" className="rounded-xl">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic - $29.99/month</SelectItem>
                  <SelectItem value="premium">Premium - $79.99/month</SelectItem>
                  <SelectItem value="enterprise">Enterprise - $199.99/month</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              color="primary" 
              className="w-full font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]" 
              size="lg" 
              isLoading={loading}
              radius="lg"
            >
              {loading ? 'Creating Account...' : 'Start Free Trial'}
            </Button>

            <p className="text-xs text-center text-default-400">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-default-500">
              Already have an account?{' '}
              <a href="/auth/sign-in" className="text-primary hover:underline">
                Sign in
              </a>
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

