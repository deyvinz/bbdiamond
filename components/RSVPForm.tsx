'use client'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Section from '@/components/Section'
import { Button, Card, CardBody } from '@heroui/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { submitRsvpAction, type RsvpActionResult } from '@/app/rsvp/actions'
import { RsvpConfetti } from './RsvpConfetti'
import { toast } from '@/components/ui/use-toast'
import type { ConfigValue } from '@/lib/types/config'
import GuestSeatingInfo from '@/components/GuestSeatingInfo'
import { 
  resolveInvitationByToken, 
  resolveInvitationByInviteCode, 
  getRSVPStatus,
  submitRSVP,
  type InvitationData,
  type RSVPStatus 
} from '@/lib/rsvp-service-direct'
import { isRsvpAllowed, getFormattedCutoffDate, getTimeUntilCutoff } from '@/lib/utils/rsvp-check'

type FormValues = { 
  invite_code: string
  response: 'accepted' | 'declined'
  party_size?: number
  email?: string
  phone?: string
  preferred_channel?: 'email' | 'sms' | 'whatsapp'
  goodwill_message?: string
  dietary_restrictions?: string
  dietary_information?: string
  food_choice?: string
}

interface RsvpResult {
  status: 'accepted' | 'declined'
  guestName: string
  events: Array<{
    name: string
    startsAtISO: string
    venue: string
    address?: string
  }>
  rsvpUrl: string
  qrImageUrl?: string
  passUrl?: string
}

export default function RSVPForm(){
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const {register, handleSubmit, setValue, watch, formState:{isSubmitting, errors}} = useForm<FormValues>({ 
    defaultValues:{ 
      response:'accepted',
      party_size: 1
    },
    mode: 'onChange'
  })
  const [result, setResult] = useState<RsvpActionResult | null>(null)
  const [config, setConfig] = useState<ConfigValue | null>(null)
  const [showConfetti, setShowConfetti] = useState(false)
  const [showGoodwillMessage, setShowGoodwillMessage] = useState(false)
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(false)
  const [invitationError, setInvitationError] = useState<string | null>(null)
  const [prefilledInviteCode, setPrefilledInviteCode] = useState<string | null>(null)
  const [invitationData, setInvitationData] = useState<InvitationData | null>(null)
  const [currentRsvpStatus, setCurrentRsvpStatus] = useState<RSVPStatus | null>(null)
  const [weddingInfo, setWeddingInfo] = useState<{
    contact_email?: string
    show_dietary_restrictions?: boolean
    show_additional_dietary_info?: boolean
    rsvp_banner_days_before?: number
  } | null>(null)
  const [isConfigLoading, setIsConfigLoading] = useState(true)
  const [isWeddingInfoLoading, setIsWeddingInfoLoading] = useState(true)
  const [foodChoices, setFoodChoices] = useState<Array<{ id: string; name: string; description?: string }>>([])

  const response = watch('response')
  const inviteCode = watch('invite_code')
  const partySize = watch('party_size')

  useEffect(() => {
    // Fetch configuration
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setConfig(data)
        // Fetch food choices if enabled
        if (data.food_choices_enabled) {
          fetch('/api/admin/food-choices')
            .then(res => res.json())
            .then(choicesData => {
              if (choicesData.success && choicesData.food_choices) {
                setFoodChoices(choicesData.food_choices)
              }
            })
            .catch(err => console.error('Failed to load food choices:', err))
        }
      })
      .catch(err => console.error('Failed to load config:', err))
      .finally(() => setIsConfigLoading(false))
    
    // Fetch wedding info for contact email
    fetch('/api/wedding-info')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.wedding) {
          setWeddingInfo({
            contact_email: data.wedding.contact_email,
            show_dietary_restrictions: data.wedding.show_dietary_restrictions ?? true,
            show_additional_dietary_info: data.wedding.show_additional_dietary_info ?? true,
            rsvp_banner_days_before: data.wedding.rsvp_banner_days_before ?? 30,
          })
        } else {
          setWeddingInfo({
            contact_email: undefined,
            show_dietary_restrictions: true,
            show_additional_dietary_info: true,
            rsvp_banner_days_before: 30,
          })
        }
      })
      .catch(err => {
        console.error('Failed to load wedding info:', err)
        setWeddingInfo({
          contact_email: undefined,
          show_dietary_restrictions: true,
          show_additional_dietary_info: true,
          rsvp_banner_days_before: 30,
        })
      })
      .finally(() => setIsWeddingInfoLoading(false))
  }, [])

  // Pre-populate form if token is provided and check RSVP status
  useEffect(() => {
    if (token) {
      setIsLoadingInvitation(true)
      setInvitationError(null)
      
      // Use direct database service instead of API calls
      resolveInvitationByToken(token)
        .then(async invitationData => {
          if (invitationData) {
            // Set form values
            setValue('invite_code', invitationData.guest.invite_code)
            setValue('email', invitationData.guest.email)
            // Set default party_size from first event's headcount if available
            const defaultHeadcount = invitationData.invitation_events?.[0]?.headcount || 1
            setValue('party_size', defaultHeadcount)
            setPrefilledInviteCode(invitationData.guest.invite_code)
            setInvitationData(invitationData)
            
            // Get RSVP status
            const rsvpStatus = await getRSVPStatus(invitationData)
            setCurrentRsvpStatus(rsvpStatus)
          } else {
            // If not found by token, try using token as invite code
            const inviteCodeData = await resolveInvitationByInviteCode(token)
            if (inviteCodeData) {
              setValue('invite_code', inviteCodeData.guest.invite_code)
              setValue('email', inviteCodeData.guest.email)
              // Set default party_size from first event's headcount if available
              const defaultHeadcount = inviteCodeData.invitation_events?.[0]?.headcount || 1
              setValue('party_size', defaultHeadcount)
              setPrefilledInviteCode(inviteCodeData.guest.invite_code)
              setInvitationData(inviteCodeData)
              const rsvpStatus = await getRSVPStatus(inviteCodeData)
              setCurrentRsvpStatus(rsvpStatus)
            }
          }
          setIsLoadingInvitation(false)
        })
        .catch(error => {
          console.error('Error loading invitation:', error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setInvitationError(`Failed to load invitation details (${errorMessage}). Please enter your invite code manually.`)
          setValue('invite_code', token)
          setIsLoadingInvitation(false)
        })
    }
  }, [token, setValue])

  useEffect(() => {
    // Show goodwill message textarea only when declined
    setShowGoodwillMessage(response === 'declined')
  }, [response])

  // Fetch invitation data when invite code changes (for manual entry)
  useEffect(() => {
    // Skip if token is provided (handled by token useEffect) or if invite code matches prefilled
    if (token || (prefilledInviteCode && inviteCode === prefilledInviteCode)) {
      return
    }

    if (inviteCode && inviteCode.length > 3) {
      setIsLoadingInvitation(true)
      setInvitationError(null)
      
      // Debounce the API call
      const timeoutId = setTimeout(async () => {
        try {
          // Resolve invitation data
          const inviteCodeData = await resolveInvitationByInviteCode(inviteCode)
          if (inviteCodeData) {
            setInvitationData(inviteCodeData)
            // Set default party_size from first event's headcount if available
            const defaultHeadcount = inviteCodeData.invitation_events?.[0]?.headcount || 1
            setValue('party_size', defaultHeadcount)
            // Get RSVP status
            const rsvpStatus = await getRSVPStatus(inviteCodeData)
            setCurrentRsvpStatus(rsvpStatus)
            setInvitationError(null)
            } else {
            setInvitationData(null)
              setCurrentRsvpStatus(null)
            setInvitationError('Invite code not found. Please check and try again.')
            }
        } catch (error) {
          console.error('Error resolving invitation:', error)
          setInvitationData(null)
            setCurrentRsvpStatus(null)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          setInvitationError(`Failed to load invitation details (${errorMessage}). Please check your invite code.`)
        } finally {
          setIsLoadingInvitation(false)
        }
      }, 500)

      return () => clearTimeout(timeoutId)
    } else if (!inviteCode) {
      setInvitationData(null)
      setCurrentRsvpStatus(null)
      setInvitationError(null)
    }
  }, [inviteCode, token, prefilledInviteCode, setValue])

  const onSubmit = async (v: FormValues) => {
    const formData = new FormData()
    formData.append('invite_code', v.invite_code)
    formData.append('response', v.response)
    if (v.party_size) formData.append('party_size', v.party_size.toString())
    if (v.email) formData.append('email', v.email)
    if (v.phone) formData.append('phone', v.phone)
    if (v.preferred_channel) formData.append('preferred_channel', v.preferred_channel)
    if (v.goodwill_message) formData.append('goodwill_message', v.goodwill_message)
    if (v.dietary_restrictions) formData.append('dietary_restrictions', v.dietary_restrictions)
    if (v.dietary_information) formData.append('dietary_information', v.dietary_information)
    // Handle food choice
    if (v.food_choice) {
      formData.append('food_choice', v.food_choice)
    }
    
    const actionResult = await submitRsvpAction(formData)
    setResult(actionResult)
    
    if (actionResult.success && actionResult.result?.status === 'accepted') {
      setShowConfetti(true)
    }
  }

  // Display current RSVP status if user has already responded
  if (currentRsvpStatus && currentRsvpStatus.status === 'accepted') {
    return (
      <Section title="RSVP" subtitle="You're already confirmed!" narrow>
        <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
          <CardBody className="p-6 md:p-8">
            <div role="status" aria-live="polite" className="text-center space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-green-600">You're confirmed! ✨</h2>
              <p className="text-gray-600">
                Welcome back, {currentRsvpStatus.guestName}! You're already on the list for our special day.
              </p>
            </div>

            {/* Confirmed Events */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Your Confirmed Events:</h3>
              <div className="space-y-3">
                {currentRsvpStatus.events.map((event, index) => {
                  // Parse text field: "2024-10-16 10:00:00" -> "Wednesday, October 16, 2024 · 10:00"
                  const [datePart, timePart] = event.startsAtISO.split(' ')
                  const [year, month, day] = datePart.split('-')
                  const eventDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                  const eventTime = timePart ? timePart.substring(0, 5) : '00:00' // Extract HH:MM
                  
                  return (
                    <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900">{event.name}</h4>
                      <p className="text-sm text-gray-600">📅 {eventDate} · {eventTime}</p>
                      <p className="text-sm text-gray-600">📍 {event.venue}</p>
                      {event.address && (
                        <p className="text-sm text-gray-600">🏠 {event.address}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* QR Code and Digital Pass */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* QR Code */}
              {currentRsvpStatus.qrImageUrl && (
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Your QR Code</h3>
                    <p className="text-sm text-gray-600 mb-4">Show this QR code at check-in</p>
                    <div className="bg-white border-2 border-yellow-400 rounded-lg p-4 inline-block">
                      <img 
                        src={currentRsvpStatus.qrImageUrl} 
                        alt="QR Code" 
                        className="mx-auto max-w-[150px]"
                      />
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      if (!currentRsvpStatus.qrImageUrl) return
                      const link = document.createElement('a')
                      link.href = currentRsvpStatus.qrImageUrl
                      link.download = `wedding-qr-code-${currentRsvpStatus.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.png`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      toast({
                        title: "QR Code Saved!",
                        description: "Your QR code has been downloaded to your device.",
                      })
                    }}
                    className="bg-yellow-600 text-white hover:bg-yellow-700"
                    radius="lg"
                  >
                    📱 Save QR Code
                  </Button>
                </div>
              )}

              {/* Digital Pass */}
              {currentRsvpStatus.passUrl && (
                <div className="text-center space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Access Pass</h3>
                    <p className="text-sm text-gray-600 mb-4">Your digital wedding pass with event details</p>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-4xl mb-2">🎫</div>
                        <p className="text-sm font-medium text-gray-700">Wedding Access Pass</p>
                        <p className="text-xs text-gray-500 mt-1">Tap to view details</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Button
                      onClick={() => {
                        if (!currentRsvpStatus.passUrl) return
                        const link = document.createElement('a')
                        link.href = currentRsvpStatus.passUrl
                        link.download = `wedding-pass-${currentRsvpStatus.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.html`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        toast({
                          title: "Digital Pass Saved!",
                          description: "Your wedding pass has been downloaded to your device.",
                        })
                      }}
                      className="w-full bg-blue-600 text-white hover:bg-blue-700"
                      radius="lg"
                    >
                      💾 Save Digital Pass
                    </Button>
                    <Button
                      onClick={() => {
                        if (!currentRsvpStatus.passUrl) return
                        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
                          window.open(currentRsvpStatus.passUrl, '_blank')
                          toast({
                            title: "Opening Digital Pass",
                            description: "On iOS, you can add this to your Apple Wallet from the opened page.",
                          })
                        } else {
                          window.open(currentRsvpStatus.passUrl, '_blank')
                          toast({
                            title: "Digital Pass Opened",
                            description: "You can save this to your device or add to your preferred wallet app.",
                          })
                        }
                      }}
                      variant="bordered"
                      className="w-full border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                      radius="lg"
                    >
                      📱 Add to Wallet
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Seating Information */}
            <div className="mt-8">
              <div className="text-center mb-6">
                <h3 className="text-xl font-serif text-gray-900 mb-2">Your Seating Assignment</h3>
                <p className="text-gray-600 text-sm">
                  Check your assigned table and seat for the reception.
                </p>
              </div>
              <GuestSeatingInfo 
                inviteCode={currentRsvpStatus.guestName ? watch('invite_code') : ''} 
                guestName={currentRsvpStatus.guestName}
              />
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                as="a"
                href="/"
                variant="bordered"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                radius="lg"
              >
                Back to Home
              </Button>
            </div>
            </div>
          </CardBody>
        </Card>
      </Section>
    )
  }

  // Display declined RSVP status
  if (currentRsvpStatus && currentRsvpStatus.status === 'declined') {
    return (
      <Section title="RSVP" subtitle="We'll miss you!" narrow>
        <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
          <CardBody className="p-6 md:p-8">
            <div role="status" aria-live="polite" className="text-center space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-600">We'll miss you! 💔</h2>
              <p className="text-gray-600">
                Hi {currentRsvpStatus.guestName}, we understand you won't be able to join us for our special day.
              </p>
              <p className="text-gray-500 text-sm">
                If you change your mind, you can always come back and update your RSVP.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setCurrentRsvpStatus(null)}
                className="bg-[#C8A951] text-white hover:bg-[#B38D39]"
                radius="lg"
              >
                Update RSVP
              </Button>
              <Button
                as="a"
                href="/"
                variant="bordered"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                radius="lg"
              >
                Back to Home
              </Button>
            </div>
            </div>
          </CardBody>
        </Card>
      </Section>
    )
  }

  // Success states
  if (result?.success && result.result) {
    const rsvpResult = result.result as RsvpResult
    
    if (rsvpResult.status === 'accepted') {
      return (
        <Section title="RSVP" subtitle="You're on the list!" narrow>
          <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
            <CardBody className="p-6 md:p-8">
              <div role="status" aria-live="polite" className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-green-600">You're confirmed! ✨</h2>
                <p className="text-gray-600">
                  We've emailed your confirmation, QR code, and digital access pass to {rsvpResult.guestName}.
                </p>
              </div>

              {/* Confirmed Events */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Your Confirmed Events:</h3>
                <div className="space-y-3">
                  {rsvpResult.events.map((event, index) => {
                    const eventDate = new Date(event.startsAtISO).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                    const eventTime = new Date(event.startsAtISO).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true,
                    })
                    
                    return (
                      <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h4 className="font-semibold text-gray-900">{event.name}</h4>
                        <p className="text-sm text-gray-600">📅 {eventDate} · {eventTime}</p>
                        <p className="text-sm text-gray-600">📍 {event.venue}</p>
                        {event.address && (
                          <p className="text-sm text-gray-600">🏠 {event.address}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* QR Code and Digital Pass */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* QR Code */}
                {rsvpResult.qrImageUrl && (
                  <div className="text-center space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Your QR Code</h3>
                      <p className="text-sm text-gray-600 mb-4">Show this QR code at check-in</p>
                      <div className="bg-white border-2 border-yellow-400 rounded-lg p-4 inline-block">
                        <img 
                          src={rsvpResult.qrImageUrl} 
                          alt="QR Code" 
                          className="mx-auto max-w-[150px]"
                        />
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        if (!rsvpResult.qrImageUrl) return
                        const link = document.createElement('a')
                        link.href = rsvpResult.qrImageUrl
                        link.download = `wedding-qr-code-${rsvpResult.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.png`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        toast({
                          title: "QR Code Saved!",
                          description: "Your QR code has been downloaded to your device.",
                        })
                      }}
                      className="bg-yellow-600 text-white hover:bg-yellow-700"
                      radius="lg"
                    >
                      📱 Save QR Code
                    </Button>
                  </div>
                )}

                {/* Digital Pass */}
                {rsvpResult.passUrl && (
                  <div className="text-center space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Digital Access Pass</h3>
                      <p className="text-sm text-gray-600 mb-4">Your digital wedding pass with event details</p>
                      <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-6 min-h-[200px] flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🎫</div>
                          <p className="text-sm font-medium text-gray-700">Wedding Access Pass</p>
                          <p className="text-xs text-gray-500 mt-1">Tap to view details</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Button
                        onClick={() => {
                          if (!rsvpResult.passUrl) return
                          const link = document.createElement('a')
                          link.href = rsvpResult.passUrl
                          link.download = `wedding-pass-${rsvpResult.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.html`
                          document.body.appendChild(link)
                          link.click()
                          document.body.removeChild(link)
                          toast({
                            title: "Digital Pass Saved!",
                            description: "Your wedding pass has been downloaded to your device.",
                          })
                        }}
                        className="w-full bg-blue-600 text-white hover:bg-blue-700"
                        radius="lg"
                      >
                        💾 Save Digital Pass
                      </Button>
                      <Button
                        onClick={() => {
                          if (!rsvpResult.passUrl) return
                          // Try to add to Apple Wallet (iOS) or Google Pay (Android)
                          if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iPad')) {
                            // For iOS, we can try to open the pass in a way that suggests adding to Wallet
                            window.open(rsvpResult.passUrl, '_blank')
                            toast({
                              title: "Opening Digital Pass",
                              description: "On iOS, you can add this to your Apple Wallet from the opened page.",
                            })
                          } else {
                            // For other devices, just open the pass
                            window.open(rsvpResult.passUrl, '_blank')
                            toast({
                              title: "Digital Pass Opened",
                              description: "You can save this to your device or add to your preferred wallet app.",
                            })
                          }
                        }}
                        variant="bordered"
                        className="w-full border-2 border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        radius="lg"
                      >
                        📱 Add to Wallet
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Seating Information */}
              <div className="mt-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-serif text-gray-900 mb-2">Your Seating Assignment</h3>
                  <p className="text-gray-600 text-sm">
                    Check your assigned table and seat for the reception.
                  </p>
                </div>
                <GuestSeatingInfo 
                  inviteCode={rsvpResult.guestName ? watch('invite_code') : ''} 
                  guestName={rsvpResult.guestName}
                />
              </div>

              <div className="flex justify-center space-x-4">
                <Button
                  as="a"
                  href="/"
                  variant="bordered"
                  className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                  radius="lg"
                >
                  Back to Home
                </Button>
              </div>
              </div>
            </CardBody>
          </Card>
          {showConfetti && <RsvpConfetti onComplete={() => setShowConfetti(false)} />}
        </Section>
      )
    } else {
      return (
        <Section title="RSVP" subtitle="Thank you for letting us know" narrow>
          <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
            <CardBody className="p-6 md:p-8">
              <div role="status" aria-live="polite" className="text-center space-y-6">
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-700">We'll miss you</h2>
                <p className="text-gray-600">
                  Thank you for letting us know that you won't be able to join us. 
                  We completely understand and appreciate you taking the time to respond.
                </p>
              </div>

              <div className="flex justify-center space-x-4">
                <a 
                  href="/"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Back to Home
                </a>
              </div>
              </div>
            </CardBody>
          </Card>
        </Section>
      )
    }
  }

  // Check if RSVP is allowed based on configuration
  const rsvpCheck = config ? isRsvpAllowed(config) : { allowed: true }
  const timeRemaining = config ? getTimeUntilCutoff(config) : { hasDeadline: false, isPast: false }
  const bannerWindowDays = weddingInfo?.rsvp_banner_days_before ?? 30
  const shouldShowDeadlineBanner =
    Boolean(
      config &&
        timeRemaining.hasDeadline &&
        !timeRemaining.isPast &&
        timeRemaining.formattedTime &&
        (timeRemaining.daysRemaining ?? 0) <= bannerWindowDays
    )
  const showDietaryRestrictionsField = weddingInfo?.show_dietary_restrictions ?? true
  const showAdditionalDietaryInfoField = weddingInfo?.show_additional_dietary_info ?? true
  const isInitialLoading = (isConfigLoading || isWeddingInfoLoading) && !currentRsvpStatus && !result

  // Build dynamic subtitle based on enabled notification channels
  const getInviteCodeSubtitle = (): string => {
    if (!config) {
      return 'Enter the invite code from your card or email'
    }

    const channels: string[] = []
    
    if (config.notification_email_enabled) {
      channels.push('email')
    }
    if (config.notification_whatsapp_enabled) {
      channels.push('WhatsApp message')
    }
    if (config.notification_sms_enabled) {
      channels.push('SMS')
    }

    if (channels.length === 0) {
      return 'Enter your invite code'
    }

    if (channels.length === 1) {
      return `Enter the invite code from your ${channels[0]}`
    }

    if (channels.length === 2) {
      return `Enter the invite code from your ${channels[0]} or ${channels[1]}`
    }

    // 3 channels
    const lastChannel = channels.pop()
    return `Enter the invite code from your ${channels.join(', ')}, or ${lastChannel}`
  }

  if (isInitialLoading) {
    return (
      <Section title="RSVP" subtitle="Loading your personalized form..." narrow>
        <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
          <CardBody className="p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-amber-100 animate-pulse" aria-hidden />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded-lg animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-lg animate-pulse w-2/3" />
              </div>
            </div>
            <div className="space-y-4">
              {[1, 2, 3].map((key) => (
                <div key={key} className="space-y-2">
                  <div className="h-4 w-1/3 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-11 bg-gray-100 rounded-2xl animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-12 bg-gray-200 rounded-2xl animate-pulse" />
          </CardBody>
        </Card>
      </Section>
    )
  }

  // If RSVP is not allowed, show a message
  if (!rsvpCheck.allowed && config) {
    return (
      <Section title="RSVP" subtitle="RSVP is currently closed" narrow>
        <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
          <CardBody className="p-6 md:p-8">
            <div role="status" aria-live="polite" className="text-center space-y-6 py-8">
            <div className="space-y-4">
              <div className="text-6xl">🔒</div>
              <h2 className="text-2xl font-bold text-gray-700">RSVP is Closed</h2>
              <p className="text-gray-600 max-w-md mx-auto">
                {rsvpCheck.reason}
              </p>
              <p className="text-gray-500 text-sm">
                If you have any questions or special circumstances, please contact us directly.
              </p>
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                as="a"
                href="/"
                variant="bordered"
                className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50"
                radius="lg"
              >
                Back to Home
              </Button>
              <Button
                as="a"
                href={weddingInfo?.contact_email ? `mailto:${weddingInfo.contact_email}` : 'mailto:contact@luwani.com'}
                className="bg-[#C8A951] text-white hover:bg-[#B38D39]"
                radius="lg"
              >
                Contact Us
              </Button>
            </div>
            </div>
          </CardBody>
        </Card>
      </Section>
    )
  }

  return (
    <Section title="RSVP" subtitle={getInviteCodeSubtitle()} narrow>
      <Card className="border border-gray-200 shadow-lg rounded-3xl bg-white" radius="lg">
        <CardBody className="p-6 md:p-8">
          {/* RSVP Deadline Warning */}
        {shouldShowDeadlineBanner && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⏰</div>
              <div>
                <p className="font-semibold text-amber-900">RSVP Deadline Approaching</p>
                <p className="text-amber-800 text-sm mt-1">
                  Please respond within <strong>{timeRemaining.formattedTime}</strong>.
                  {config?.rsvp_cutoff_date && (
                    <span className="block mt-1">
                      Deadline: {getFormattedCutoffDate(config)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoadingInvitation && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">Loading your invitation details...</p>
          </div>
        )}

        {/* Invitation Error */}
        {invitationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">{invitationError}</p>
          </div>
        )}

        {!isLoadingInvitation && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Invite Code */}
            <div className="space-y-2">
              <Label htmlFor="invite_code">Invite Code *</Label>
              <Input 
                id="invite_code"
                required 
                className={errors.invite_code ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                {...register('invite_code', { 
                  required: 'Invite code is required',
                  minLength: { value: 3, message: 'Invite code must be at least 3 characters' }
                })}
              />
              {errors.invite_code && (
                <p className="text-sm text-red-600">{errors.invite_code.message}</p>
              )}
              {prefilledInviteCode && inviteCode !== prefilledInviteCode && (
                <p className="text-sm text-amber-600">
                  ⚠️ You've changed the invite code. Make sure it's correct before submitting.
                </p>
              )}
            </div>

            {/* Response */}
            <div className="space-y-2">
              <Label htmlFor="response">Will you be joining us? *</Label>
              <Select 
                value={response}
                onValueChange={(v) => setValue('response', v as 'accepted' | 'declined', { shouldValidate: true })}
              >
                <SelectTrigger id="response" className={errors.response ? 'border-red-500 rounded-xl' : 'rounded-xl'}>
                  <SelectValue placeholder="Choose your response" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="accepted">Accept with joy ✨</SelectItem>
                  <SelectItem value="declined">Regretfully decline</SelectItem>
                </SelectContent>
              </Select>
              <input
                type="hidden"
                {...register('response', { required: 'Please select a response' })}
              />
              {errors.response && (
                <p className="text-sm text-red-600">{errors.response.message}</p>
              )}
            </div>

            {/* Party Size - Only show when accepted and plus-ones are enabled */}
            {response === 'accepted' && config?.plus_ones_enabled && invitationData?.guest?.total_guests && invitationData.guest.total_guests > 1 && (() => {
              const totalGuests = invitationData.guest.total_guests
              // total_guests is guest-specific and should always be used as the maximum
              // max_party_size is a global setting used when creating invitations, but guest-specific total_guests takes precedence
              // Only apply max_party_size as an upper bound if it's set and is actually higher than totalGuests
              // In practice, totalGuests should always be <= max_party_size when invitations are created properly
              const calculatedMax = totalGuests
              const maxPartySize = config.max_party_size || totalGuests
              return (
                <div className="space-y-2">
                  <Label htmlFor="party_size">
                    Number of Guests *
                  </Label>
                  <Input
                    id="party_size"
                    type="number"
                    min="1"
                    max={calculatedMax}
                    defaultValue={invitationData.invitation_events?.[0]?.headcount || 1}
                    className={errors.party_size ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                    {...register('party_size', {
                      required: 'Please specify the number of guests',
                      min: { value: 1, message: 'At least 1 guest is required' },
                      max: {
                        value: calculatedMax,
                        message: `Maximum ${calculatedMax} guests allowed`
                      },
                      valueAsNumber: true
                    })}
                  />
                  {errors.party_size && (
                    <p className="text-sm text-red-600">{errors.party_size.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Including yourself. Maximum: {calculatedMax} {totalGuests < maxPartySize ? `(based on your invitation)` : ''}
                  </p>
                </div>
              )
            })()}

            {/* Contact Information - Dynamic based on notification channels */}
            {(() => {
              const emailEnabled = config?.notification_email_enabled ?? true
              const smsEnabled = config?.notification_sms_enabled ?? false
              const whatsappEnabled = config?.notification_whatsapp_enabled ?? false
              const hasMultipleChannels = [emailEnabled, smsEnabled, whatsappEnabled].filter(Boolean).length > 1
              const hasSmsOrWhatsapp = smsEnabled || whatsappEnabled
              
              // Determine which input to show
              const showEmailInput = emailEnabled
              const showPhoneInput = hasSmsOrWhatsapp
              
              // Build helper text
              const getContactHelperText = () => {
                const channels: string[] = []
                if (emailEnabled) channels.push('email')
                if (smsEnabled) channels.push('SMS')
                if (whatsappEnabled) channels.push('WhatsApp')
                
                if (channels.length === 0) {
                  return 'We\'ll use your contact info from the invitation'
                }
                
                const channelText = channels.join(' or ')
                return `Optional - We'll send your confirmation via ${channelText}. Leave blank to use your invitation contact info.`
              }
              
              return (
                <>
                  {/* Email Input */}
                  {showEmailInput && (
                    <div className="space-y-2">
                      <Label htmlFor="email">
                        Email {!hasSmsOrWhatsapp ? '(for confirmation & QR code)' : ''}
                      </Label>
                      <Input 
                        id="email"
                        type="email" 
                        placeholder={invitationData?.guest?.email || 'your@email.com'}
                        className={errors.email ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                        {...register('email', {
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: 'Please enter a valid email address'
                          }
                        })}
                      />
                      {errors.email && (
                        <p className="text-sm text-red-600">{errors.email.message}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Phone Input - shown when SMS or WhatsApp is enabled */}
                  {showPhoneInput && (
                    <div className="space-y-2">
                      <Label htmlFor="phone">
                        Phone Number {smsEnabled && whatsappEnabled ? '(for SMS/WhatsApp confirmation)' : smsEnabled ? '(for SMS confirmation)' : '(for WhatsApp confirmation)'}
                      </Label>
                      <Input 
                        id="phone"
                        type="tel" 
                        placeholder={invitationData?.guest?.phone || '+1234567890'}
                        className={errors.phone ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                        {...register('phone', {
                          pattern: {
                            value: /^\+?[0-9\s\-().]{7,20}$/,
                            message: 'Please enter a valid phone number'
                          }
                        })}
                      />
                      {errors.phone && (
                        <p className="text-sm text-red-600">{errors.phone.message}</p>
                      )}
                    </div>
                  )}
                  
                  {/* Preferred Channel Selection - shown when multiple channels available */}
                  {hasMultipleChannels && (showEmailInput || showPhoneInput) && (
                    <div className="space-y-2">
                      <Label htmlFor="preferred_channel">Preferred Confirmation Method</Label>
                      <Select 
                        value={watch('preferred_channel') || ''}
                        onValueChange={(v) => setValue('preferred_channel', v as 'email' | 'sms' | 'whatsapp', { shouldValidate: true })}
                      >
                        <SelectTrigger id="preferred_channel" className="rounded-xl">
                          <SelectValue placeholder="Use default from invitation" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Use default from invitation</SelectItem>
                          {emailEnabled && <SelectItem value="email">📧 Email</SelectItem>}
                          {smsEnabled && <SelectItem value="sms">📱 SMS</SelectItem>}
                          {whatsappEnabled && <SelectItem value="whatsapp">💬 WhatsApp</SelectItem>}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-gray-500">
                        {getContactHelperText()}
                      </p>
                    </div>
                  )}
                  
                  {/* Helper text when only one channel */}
                  {!hasMultipleChannels && (showEmailInput || showPhoneInput) && (
                    <p className="text-xs text-gray-500 -mt-1">
                      {getContactHelperText()}
                    </p>
                  )}
                </>
              )
            })()}

            {/* Dietary Requirements & Food Choices (only shown when accepted) */}
            {response === 'accepted' && config?.food_choices_enabled && (
              <>
                {/* Food Choice */}
                <div className="space-y-2">
                  <Label htmlFor="food_choice">
                    Meal Selection
                    {config.food_choices_required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  {foodChoices.length > 0 ? (
                    <Select 
                      value={watch('food_choice') || ''}
                      onValueChange={(value) => {
                        setValue('food_choice', value, { shouldValidate: true })
                      }}
                    >
                      <SelectTrigger 
                        id="food_choice" 
                        className={errors.food_choice ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                      >
                        <SelectValue placeholder="Select your meal preference" />
                      </SelectTrigger>
                      <SelectContent>
                        {foodChoices.map((choice) => (
                          <SelectItem key={choice.id} value={choice.name}>
                            {choice.name}
                            {choice.description && ` - ${choice.description}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input 
                      id="food_choice"
                      type="text"
                      placeholder="Enter your meal preference"
                      className={errors.food_choice ? 'border-red-500 rounded-xl' : 'rounded-xl'}
                      {...register('food_choice', {
                        required: config.food_choices_required ? 'Please select or enter your meal preference' : false
                      })}
                    />
                  )}
                  <input
                    type="hidden"
                    {...register('food_choice', {
                      required: config.food_choices_required ? 'Please select or enter your meal preference' : false
                    })}
                  />
                  {errors.food_choice && (
                    <p className="text-sm text-red-600">{errors.food_choice.message}</p>
                  )}
                  {foodChoices.length > 0 && (
                    <p className="text-xs text-gray-500">Select a meal option from the list</p>
                  )}
                </div>

              </>
            )}
            {response === 'accepted' && showDietaryRestrictionsField && (
              <div className="space-y-2">
                <Label htmlFor="dietary_restrictions">Dietary Restrictions or Allergies</Label>
                <Textarea 
                  id="dietary_restrictions"
                  rows={3}
                  placeholder="e.g., Nut allergy, Vegetarian, Gluten-free..."
                  className={errors.dietary_restrictions ? 'border-red-500 rounded-xl resize-none' : 'rounded-xl resize-none'}
                  {...register('dietary_restrictions', {
                    maxLength: {
                      value: 500,
                      message: 'Dietary restrictions must be less than 500 characters'
                    }
                  })}
                />
                {errors.dietary_restrictions && (
                  <p className="text-sm text-red-600">{errors.dietary_restrictions.message}</p>
                )}
                <p className="text-xs text-gray-500">Please let us know about any allergies or dietary restrictions</p>
              </div>
            )}
            {response === 'accepted' && showAdditionalDietaryInfoField && (
              <div className="space-y-2">
                <Label htmlFor="dietary_information">Additional Dietary Information (Optional)</Label>
                <Textarea 
                  id="dietary_information"
                  rows={2}
                  placeholder="Any additional information about your dietary needs..."
                  className={errors.dietary_information ? 'border-red-500 rounded-xl resize-none' : 'rounded-xl resize-none'}
                  {...register('dietary_information', {
                    maxLength: {
                      value: 500,
                      message: 'Dietary information must be less than 500 characters'
                    }
                  })}
                />
                {errors.dietary_information && (
                  <p className="text-sm text-red-600">{errors.dietary_information.message}</p>
                )}
              </div>
            )}

            {/* Goodwill Message (only shown when declined) */}
            {showGoodwillMessage && (
              <div className="space-y-2">
                <Label htmlFor="goodwill_message">Send a message to the couple (optional)</Label>
                <Textarea 
                  id="goodwill_message"
                  rows={4}
                  className={errors.goodwill_message ? 'border-red-500 rounded-xl resize-none' : 'rounded-xl resize-none'}
                  {...register('goodwill_message')}
                />
                {errors.goodwill_message && (
                  <p className="text-sm text-red-600">{errors.goodwill_message.message}</p>
                )}
              </div>
            )}

            {/* Error Message */}
            {result && !result.success && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{result.message}</p>
                {result.errors && (
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside">
                    {Object.entries(result.errors).map(([field, messages]) => (
                      <li key={field}>{messages.join(', ')}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* RSVP Footer */}
            {config?.rsvp_footer && (
              <div 
                className="mt-6 pt-6 border-t border-gray-200 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: config.rsvp_footer }}
              />
            )}

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button 
                type="submit" 
                color="primary"
                className="bg-[#C8A951] text-white font-semibold"
                isLoading={isSubmitting}
                disabled={(() => {
                  // Disable if submitting
                  if (isSubmitting) return true
                  
                  // Disable if any data is still loading
                  if (isLoadingInvitation || isConfigLoading || isWeddingInfoLoading) return true
                  
                  // Disable if config is not loaded yet
                  if (!config) return true
                  
                  // Disable if party_size validation fails when required
                  if (response === 'accepted' && config?.plus_ones_enabled && invitationData?.guest?.total_guests && invitationData.guest.total_guests > 1) {
                    return errors.party_size !== undefined || partySize === undefined || partySize === null || partySize < 1
                  }
                  
                  return false
                })()}
                radius="lg"
                size="lg"
              >
                {isSubmitting ? 'Submitting…' : (isLoadingInvitation || isConfigLoading || isWeddingInfoLoading) ? 'Loading…' : 'Submit RSVP'}
              </Button>
            </div>
          </form>
        )}
        </CardBody>
      </Card>
    </Section>
  )
}
