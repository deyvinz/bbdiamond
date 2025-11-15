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
  const [emailSent, setEmailSent] = useState(false)
  const [otp, setOtp] = useState('')
  const [formData, setFormData] = useState({
    email: '',
    fullName: '',
    plan: 'basic' // basic, premium, enterprise
  })

  useEffect(() => {
    trackConversion.signupStarted()
  }, [])

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Send OTP for signup
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: formData.email,
        options: {
          data: {
            full_name: formData.fullName,
            plan: formData.plan,
          },
        },
      })

      if (authError) throw authError

      setEmailSent(true)
      trackConversion.signupStarted()
      
      toast({
        title: 'Check your email!',
        description: 'We\'ve sent you a 6-digit code to complete your signup.',
      })
    } catch (error: any) {
      console.error('Signup error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to send OTP',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        email: formData.email,
        token: otp,
        type: 'email',
      })

      if (verifyError) throw verifyError

      if (data?.session && data?.user) {
        // Customer record will be created in the callback route
        trackConversion.signupCompleted(formData.plan)
        trackConversion.trialStarted(formData.plan)
        trackConversion.onboardingStarted()

        toast({
          title: 'Account created!',
          description: 'Welcome! Let\'s set up your wedding website.',
        })

        router.push(`/onboarding?customer_id=${data.user.id}`)
      } else {
        throw new Error('Failed to create session')
      }
    } catch (error: any) {
      console.error('OTP verification error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to verify OTP',
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
          {emailSent ? (
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 text-center">
                  Check your email! We've sent you a 6-digit code. Enter it below to complete your signup.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="otp">Verification Code *</Label>
                <Input
                  id="otp"
                  type="text"
                  required
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="rounded-xl text-center text-2xl tracking-widest"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              <Button 
                type="submit" 
                color="primary" 
                className="w-full font-semibold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]" 
                size="lg" 
                isLoading={loading}
                radius="lg"
                disabled={otp.length !== 6}
              >
                {loading ? 'Verifying...' : 'Verify OTP & Create Account'}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setEmailSent(false)
                  setOtp('')
                }}
                className="w-full px-5 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Use a different email
              </button>
            </form>
          ) : (
          <form onSubmit={handleSendOtp} className="space-y-5">
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
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>

            <p className="text-xs text-center text-default-400">
              By signing up, you agree to our Terms of Service and Privacy Policy
            </p>
          </form>
          )}

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

