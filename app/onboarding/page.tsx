'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button, Card, CardBody, CardHeader, Input } from '@heroui/react'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, MapPin, Palette, Globe, Check } from 'lucide-react'
import { trackConversion } from '@/lib/analytics'

type Step = 'couple' | 'dates' | 'theme' | 'domain' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState<Step>('couple')
  const [loading, setLoading] = useState(false)
  const [customerId, setCustomerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    // Step 1: Couple Info
    brideName: '',
    groomName: '',
    coupleDisplayName: '',
    contactEmail: '',
    
    // Step 2: Dates & Location
    primaryDate: '',
    venueName: '',
    city: '',
    country: '',
    
    // Step 3: Theme
    theme: 'classic', // classic, modern, elegant, rustic
    
    // Step 4: Domain
    subdomain: '',
    customDomain: ''
  })
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null)
  const [checkingSubdomain, setCheckingSubdomain] = useState(false)

  useEffect(() => {
    const customerIdParam = searchParams.get('customer_id')
    if (customerIdParam) {
      setCustomerId(customerIdParam)
    } else {
      // Try to get from current user
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setCustomerId(user.id)
      })
    }
  }, [searchParams])

  // Check subdomain availability
  const checkSubdomainAvailability = async (subdomain: string) => {
    if (!subdomain || subdomain.length < 3) {
      setSubdomainAvailable(null)
      return
    }

    setCheckingSubdomain(true)
    try {
      const response = await fetch(`/api/subdomain/check?subdomain=${encodeURIComponent(subdomain)}`)
      const data = await response.json()
      setSubdomainAvailable(data.available)
      
      if (!data.available && data.error) {
        toast({
          title: 'Subdomain unavailable',
          description: data.error || 'This subdomain is already taken',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error checking subdomain:', error)
      setSubdomainAvailable(null)
    } finally {
      setCheckingSubdomain(false)
    }
  }

  // Save progress to localStorage
  useEffect(() => {
    if (currentStep !== 'complete') {
      localStorage.setItem('onboarding_progress', JSON.stringify({
        currentStep,
        formData,
        customerId,
      }))
    }
  }, [currentStep, formData, customerId])

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_progress')
      if (saved) {
        const { currentStep: savedStep, formData: savedData, customerId: savedCustomerId } = JSON.parse(saved)
        if (savedStep && savedData) {
          setFormData(savedData)
          setCurrentStep(savedStep as Step)
          if (savedCustomerId) setCustomerId(savedCustomerId)
        }
      }
    } catch (error) {
      console.error('Error loading onboarding progress:', error)
    }
  }, [])

  // Clear saved progress on completion
  useEffect(() => {
    if (currentStep === 'complete') {
      localStorage.removeItem('onboarding_progress')
    }
  }, [currentStep])

  // Debounce subdomain check
  useEffect(() => {
    if (currentStep === 'domain' && formData.subdomain) {
      const timer = setTimeout(() => {
        checkSubdomainAvailability(formData.subdomain)
      }, 500)
      return () => clearTimeout(timer)
    } else {
      setSubdomainAvailable(null)
    }
  }, [formData.subdomain, currentStep])

  const handleStepSubmit = async () => {
    if (currentStep === 'couple') {
      // Validate
      if (!formData.brideName || !formData.groomName || !formData.contactEmail) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        })
        return
      }
      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(formData.contactEmail)) {
        toast({
          title: 'Invalid Email',
          description: 'Please enter a valid email address',
          variant: 'destructive',
        })
        return
      }
      setCurrentStep('dates')
    } else if (currentStep === 'dates') {
      // Validate
      if (!formData.primaryDate || !formData.venueName || !formData.city || !formData.country) {
        toast({
          title: 'Missing Information',
          description: 'Please fill in all required fields',
          variant: 'destructive',
        })
        return
      }
      // Date validation
      const selectedDate = new Date(formData.primaryDate)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      if (selectedDate < today) {
        toast({
          title: 'Invalid Date',
          description: 'Wedding date cannot be in the past',
          variant: 'destructive',
        })
        return
      }
      setCurrentStep('theme')
    } else if (currentStep === 'theme') {
      setCurrentStep('domain')
    } else if (currentStep === 'domain') {
      // Validate subdomain if provided
      if (formData.subdomain && subdomainAvailable === false) {
        toast({
          title: 'Subdomain unavailable',
          description: 'Please choose a different subdomain',
          variant: 'destructive',
        })
        return
      }
      if (formData.subdomain && subdomainAvailable === null && checkingSubdomain) {
        toast({
          title: 'Checking subdomain',
          description: 'Please wait while we verify subdomain availability',
        })
        return
      }
      await createWedding()
    }
  }

  const createWedding = async () => {
    if (!customerId) {
      toast({
        title: 'Error',
        description: 'Customer ID not found. Please sign in again.',
        variant: 'destructive',
      })
      router.push('/store/signup')
      return
    }

    setLoading(true)

    try {
      // Generate slug from couple name or names
      const displayName = formData.coupleDisplayName || `${formData.brideName} & ${formData.groomName}`
      const slug = displayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'couple'
      
      // Ensure slug is unique by checking if it exists
      const { data: existingSlug } = await supabase
        .from('weddings')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()
      
      let finalSlug = slug
      if (existingSlug) {
        // Append random suffix if slug exists
        finalSlug = `${slug}-${Math.random().toString(36).substring(2, 7)}`
      }

      // Create wedding
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .insert({
          slug: finalSlug,
          bride_name: formData.brideName,
          groom_name: formData.groomName,
          couple_display_name: formData.coupleDisplayName || `${formData.brideName} & ${formData.groomName}`,
          contact_email: formData.contactEmail,
          primary_date: formData.primaryDate,
          venue_name: formData.venueName,
          city: formData.city,
          country: formData.country,
          subdomain: formData.subdomain?.toLowerCase().trim() || null,
          custom_domain: formData.customDomain?.toLowerCase().trim() || null,
          status: 'active',
        })
        .select()
        .single()

      if (weddingError) throw weddingError

      // Link wedding to customer
      const { error: ownerError } = await supabase
        .from('wedding_owners')
        .insert({
          wedding_id: wedding.id,
          customer_id: customerId,
          role: 'owner'
        })

      if (ownerError) throw ownerError

      // Create default theme
      const themeColors = getThemeColors(formData.theme)
      const { error: themeError } = await supabase
        .from('wedding_themes')
        .insert({
          wedding_id: wedding.id,
          ...themeColors
        })

      if (themeError) throw themeError

      // Create default config
      const { error: configError } = await supabase
        .from('wedding_config')
        .insert({
          wedding_id: wedding.id,
          key: 'plus_ones_enabled',
          value: true
        })

      if (configError) console.error('Config error:', configError)

      // Track completion
      trackConversion.onboardingCompleted()

      toast({
        title: 'Success!',
        description: 'Your wedding website has been created.',
      })

      setCurrentStep('complete')
      
      // Redirect to admin after 2 seconds
      setTimeout(() => {
        router.push(`/admin?wedding_id=${wedding.id}`)
      }, 2000)
    } catch (error: any) {
      console.error('Onboarding error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to create wedding',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const getThemeColors = (theme: string) => {
    const themes: Record<string, any> = {
      classic: {
        primary_color: '#D4AF37',
        secondary_color: '#8B7355',
        accent_color: '#F5E6D3'
      },
      modern: {
        primary_color: '#2C3E50',
        secondary_color: '#E74C3C',
        accent_color: '#ECF0F1'
      },
      elegant: {
        primary_color: '#6B4423',
        secondary_color: '#C9A961',
        accent_color: '#F8F6F0'
      },
      rustic: {
        primary_color: '#8B4513',
        secondary_color: '#CD853F',
        accent_color: '#FFF8DC'
      }
    }
    return themes[theme] || themes.classic
  }

  const steps = [
    { id: 'couple', label: 'Couple Info', icon: '👫' },
    { id: 'dates', label: 'Dates & Location', icon: '📅' },
    { id: 'theme', label: 'Theme', icon: '🎨' },
    { id: 'domain', label: 'Domain', icon: '🌐' }
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  // Track onboarding step changes
  useEffect(() => {
    if (currentStep !== 'complete' && currentStepIndex >= 0) {
      trackConversion.onboardingStepCompleted(currentStep, currentStepIndex + 1)
    }
  }, [currentStep, currentStepIndex])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-[#FDFBF6] py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                      idx <= currentStepIndex
                        ? 'bg-[#C8A951] text-white shadow-lg'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {idx < currentStepIndex ? <Check className="h-5 w-5" /> : step.icon}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block text-[#1E1E1E]/70">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 transition-colors ${
                      idx < currentStepIndex ? 'bg-[#C8A951]' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-[#1E1E1E]/60 mt-2">
            Step {currentStepIndex + 1} of {steps.length}
          </p>
        </div>

        <Card className="shadow-xl rounded-3xl border border-gray-200" radius="lg">
          <CardBody className="p-8">
          {/* Step 1: Couple Information */}
          {currentStep === 'couple' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2 text-[#1E1E1E]">Tell Us About You</h2>
                <p className="text-[#1E1E1E]/70">Let's start with the basics</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Bride's Name"
                  labelPlacement="outside"
                  placeholder="Sarah"
                  value={formData.brideName}
                  onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                  isRequired
                  radius="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                  }}
                />
                <Input
                  label="Groom's Name"
                  labelPlacement="outside"
                  placeholder="John"
                  value={formData.groomName}
                  onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                  isRequired
                  radius="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                  }}
                />
              </div>

              <Input
                label="Display Name (Optional)"
                labelPlacement="outside"
                placeholder="John & Sarah"
                value={formData.coupleDisplayName}
                onChange={(e) => setFormData({ ...formData, coupleDisplayName: e.target.value })}
                description={`Leave blank to use "${formData.brideName || 'Bride'} & ${formData.groomName || 'Groom'}"`}
                radius="lg"
                classNames={{
                  input: "text-base",
                  label: "text-[#1E1E1E] font-medium",
                  description: "text-xs text-[#1E1E1E]/60",
                }}
              />

              <Input
                label="Contact Email"
                labelPlacement="outside"
                type="email"
                placeholder="you@example.com"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                isRequired
                radius="lg"
                classNames={{
                  input: "text-base",
                  label: "text-[#1E1E1E] font-medium",
                }}
              />
            </div>
          )}

          {/* Step 2: Dates & Location */}
          {currentStep === 'dates' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2 text-[#1E1E1E]">When & Where</h2>
                <p className="text-[#1E1E1E]/70">Your wedding details</p>
              </div>

              <Input
                label="Wedding Date"
                labelPlacement="outside"
                type="date"
                value={formData.primaryDate}
                onChange={(e) => setFormData({ ...formData, primaryDate: e.target.value })}
                isRequired
                min={new Date().toISOString().split('T')[0]}
                radius="lg"
                classNames={{
                  input: "text-base",
                  label: "text-[#1E1E1E] font-medium",
                }}
              />

              <Input
                label="Venue Name"
                labelPlacement="outside"
                placeholder="Grand Ballroom"
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                isRequired
                radius="lg"
                classNames={{
                  input: "text-base",
                  label: "text-[#1E1E1E] font-medium",
                }}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="City"
                  labelPlacement="outside"
                  placeholder="Lagos"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  isRequired
                  radius="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                  }}
                />
                <Input
                  label="Country"
                  labelPlacement="outside"
                  placeholder="Nigeria"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  isRequired
                  radius="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                  }}
                />
              </div>
            </div>
          )}

          {/* Step 3: Theme */}
          {currentStep === 'theme' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2 text-[#1E1E1E]">Choose Your Style</h2>
                <p className="text-[#1E1E1E]/70">You can customize this later</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {[
                  { id: 'classic', name: 'Classic', color: '#D4AF37' },
                  { id: 'modern', name: 'Modern', color: '#2C3E50' },
                  { id: 'elegant', name: 'Elegant', color: '#6B4423' },
                  { id: 'rustic', name: 'Rustic', color: '#8B4513' }
                ].map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, theme: theme.id })}
                    className={`p-6 border-2 rounded-xl text-center transition-all ${
                      formData.theme === theme.id
                        ? 'border-[#C8A951] bg-[#C8A951]/10 shadow-lg'
                        : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3 shadow-md"
                      style={{ backgroundColor: theme.color }}
                    />
                    <div className="font-semibold text-[#1E1E1E]">{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Domain */}
          {currentStep === 'domain' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2 text-[#1E1E1E]">Your Website Address</h2>
                <p className="text-[#1E1E1E]/70">Choose how guests will find you</p>
              </div>

              <div>
                <Input
                  label="Subdomain (Free)"
                  labelPlacement="outside"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                  placeholder="john-sarah"
                  description="Example: john-sarah.weddingplatform.com"
                  radius="lg"
                  endContent={
                    <span className="text-[#1E1E1E]/50 text-sm pr-2">.weddingplatform.com</span>
                  }
                  errorMessage={
                    subdomainAvailable === false 
                      ? 'This subdomain is already taken. Please choose another.'
                      : undefined
                  }
                  color={subdomainAvailable === false ? 'danger' : subdomainAvailable === true ? 'success' : 'default'}
                  isInvalid={subdomainAvailable === false}
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                    description: "text-xs text-[#1E1E1E]/60",
                  }}
                />
                {checkingSubdomain && (
                  <p className="text-xs text-[#1E1E1E]/60 mt-1">Checking availability...</p>
                )}
                {subdomainAvailable === true && formData.subdomain && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-green-600">
                    <Check className="h-4 w-4" />
                    <span>Subdomain is available!</span>
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <Input
                  label="Custom Domain (Premium)"
                  labelPlacement="outside"
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="johnandsarah.com"
                  description="Available on Premium and Enterprise plans"
                  isDisabled
                  radius="lg"
                  classNames={{
                    input: "text-base",
                    label: "text-[#1E1E1E] font-medium",
                    description: "text-xs text-[#1E1E1E]/60",
                  }}
                />
              </div>
            </div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-serif font-bold mb-2 text-[#1E1E1E]">You're All Set!</h2>
              <p className="text-[#1E1E1E]/70 mb-6">
                Your wedding website has been created successfully!
              </p>
              <p className="text-sm text-[#1E1E1E]/60">
                Redirecting to your admin dashboard...
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'complete' && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="bordered"
                onClick={() => {
                  const prevStep = steps[currentStepIndex - 1]
                  if (prevStep) setCurrentStep(prevStep.id as Step)
                }}
                isDisabled={currentStepIndex === 0}
                radius="lg"
                className="border-2 border-[#1E1E1E] text-[#1E1E1E] font-semibold"
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={handleStepSubmit}
                isLoading={loading}
                className="bg-[#C8A951] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                radius="lg"
                size="lg"
              >
                {loading ? 'Creating...' : currentStep === 'domain' ? 'Create Website' : 'Next'}
              </Button>
            </div>
          )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}

