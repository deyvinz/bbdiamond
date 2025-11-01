'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { supabase } from '@/lib/supabase-browser'
import { useToast } from '@/components/ui/use-toast'
import { Calendar, MapPin, Palette, Globe } from 'lucide-react'

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
      setCurrentStep('theme')
    } else if (currentStep === 'theme') {
      setCurrentStep('domain')
    } else if (currentStep === 'domain') {
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
      // Generate slug from couple name
      const slug = formData.coupleDisplayName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')

      // Create wedding
      const { data: wedding, error: weddingError } = await supabase
        .from('weddings')
        .insert({
          slug,
          bride_name: formData.brideName,
          groom_name: formData.groomName,
          couple_display_name: formData.coupleDisplayName || `${formData.brideName} & ${formData.groomName}`,
          contact_email: formData.contactEmail,
          primary_date: formData.primaryDate,
          venue_name: formData.venueName,
          city: formData.city,
          country: formData.country,
          subdomain: formData.subdomain || null,
          custom_domain: formData.customDomain || null,
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gold-50/30 py-12 px-4">
      <div className="container max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      idx <= currentStepIndex
                        ? 'bg-gold-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {idx < currentStepIndex ? '✓' : step.icon}
                  </div>
                  <span className="text-xs mt-2 text-center hidden sm:block">{step.label}</span>
                </div>
                {idx < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 ${
                      idx < currentStepIndex ? 'bg-gold-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="p-8">
          {/* Step 1: Couple Information */}
          {currentStep === 'couple' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2">Tell Us About You</h2>
                <p className="text-muted-foreground">Let's start with the basics</p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="brideName">Bride's Name *</Label>
                  <Input
                    id="brideName"
                    value={formData.brideName}
                    onChange={(e) => setFormData({ ...formData, brideName: e.target.value })}
                    placeholder="Sarah"
                  />
                </div>
                <div>
                  <Label htmlFor="groomName">Groom's Name *</Label>
                  <Input
                    id="groomName"
                    value={formData.groomName}
                    onChange={(e) => setFormData({ ...formData, groomName: e.target.value })}
                    placeholder="John"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="coupleDisplayName">Display Name</Label>
                <Input
                  id="coupleDisplayName"
                  value={formData.coupleDisplayName}
                  onChange={(e) => setFormData({ ...formData, coupleDisplayName: e.target.value })}
                  placeholder="John & Sarah (optional)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave blank to use "{formData.brideName || 'Bride'} & {formData.groomName || 'Groom'}"
                </p>
              </div>

              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="you@example.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Dates & Location */}
          {currentStep === 'dates' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2">When & Where</h2>
                <p className="text-muted-foreground">Your wedding details</p>
              </div>

              <div>
                <Label htmlFor="primaryDate">Wedding Date *</Label>
                <Input
                  id="primaryDate"
                  type="date"
                  value={formData.primaryDate}
                  onChange={(e) => setFormData({ ...formData, primaryDate: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="venueName">Venue Name *</Label>
                <Input
                  id="venueName"
                  value={formData.venueName}
                  onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
                  placeholder="Grand Ballroom"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Lagos"
                  />
                </div>
                <div>
                  <Label htmlFor="country">Country *</Label>
                  <Input
                    id="country"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    placeholder="Nigeria"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Theme */}
          {currentStep === 'theme' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2">Choose Your Style</h2>
                <p className="text-muted-foreground">You can customize this later</p>
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
                    className={`p-6 border-2 rounded-lg text-center transition-all ${
                      formData.theme === theme.id
                        ? 'border-gold-600 bg-gold-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-16 h-16 rounded-full mx-auto mb-3"
                      style={{ backgroundColor: theme.color }}
                    />
                    <div className="font-semibold">{theme.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Domain */}
          {currentStep === 'domain' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-serif font-bold mb-2">Your Website Address</h2>
                <p className="text-muted-foreground">Choose how guests will find you</p>
              </div>

              <div>
                <Label htmlFor="subdomain">Subdomain (Free)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                    placeholder="john-sarah"
                  />
                  <span className="text-muted-foreground">.weddingplatform.com</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Example: john-sarah.weddingplatform.com
                </p>
              </div>

              <div className="border-t pt-6">
                <Label htmlFor="customDomain">Custom Domain (Premium)</Label>
                <Input
                  id="customDomain"
                  value={formData.customDomain}
                  onChange={(e) => setFormData({ ...formData, customDomain: e.target.value })}
                  placeholder="johnandsarah.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available on Premium and Enterprise plans
                </p>
              </div>
            </div>
          )}

          {/* Complete */}
          {currentStep === 'complete' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-serif font-bold mb-2">You're All Set!</h2>
              <p className="text-muted-foreground">
                Redirecting to your admin dashboard...
              </p>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep !== 'complete' && (
            <div className="flex justify-between mt-8">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const prevStep = steps[currentStepIndex - 1]
                  if (prevStep) setCurrentStep(prevStep.id as Step)
                }}
                disabled={currentStepIndex === 0}
              >
                Previous
              </Button>
              <Button
                type="button"
                onClick={handleStepSubmit}
                disabled={loading}
              >
                {loading ? 'Creating...' : currentStep === 'domain' ? 'Create Website' : 'Next'}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

