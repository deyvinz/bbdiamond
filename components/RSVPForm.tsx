'use client'
import { useForm } from 'react-hook-form'
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Section from '@/components/Section'
import Card from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  email?: string
  goodwill_message?: string
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
      response:'accepted' 
    }
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

  const response = watch('response')
  const inviteCode = watch('invite_code')

  useEffect(() => {
    // Fetch configuration
    fetch('/api/config')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(err => console.error('Failed to load config:', err))
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
            console.log('Invitation data found by token:', invitationData)
            // Set form values
            setValue('invite_code', invitationData.guest.invite_code)
            setValue('email', invitationData.guest.email)
            setPrefilledInviteCode(invitationData.guest.invite_code)
            setInvitationData(invitationData)
            
            // Get RSVP status
            const rsvpStatus = await getRSVPStatus(invitationData)
            setCurrentRsvpStatus(rsvpStatus)
          } else {
            // If not found by token, try using token as invite code
            console.log('Token not found, trying as invite code:', token)
            const inviteCodeData = await resolveInvitationByInviteCode(token)
            if (inviteCodeData) {
              setValue('invite_code', inviteCodeData.guest.invite_code)
              setValue('email', inviteCodeData.guest.email)
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

  // Check RSVP status when invite code changes (for manual entry)
  useEffect(() => {
    if (inviteCode && inviteCode.length > 3 && !token) {
      // Debounce the API call
      const timeoutId = setTimeout(() => {
        fetch(`/api/rsvp/status?invite_code=${encodeURIComponent(inviteCode)}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.rsvpStatus) {
              setCurrentRsvpStatus(data.rsvpStatus)
            } else {
              setCurrentRsvpStatus(null)
            }
          })
          .catch(error => {
            console.error('Error checking RSVP status:', error)
            setCurrentRsvpStatus(null)
          })
      }, 500)

      return () => clearTimeout(timeoutId)
    } else if (!inviteCode) {
      setCurrentRsvpStatus(null)
    }
  }, [inviteCode, token])

  const onSubmit = async (v: FormValues) => {
    const formData = new FormData()
    formData.append('invite_code', v.invite_code)
    formData.append('response', v.response)
    if (v.email) formData.append('email', v.email)
    if (v.goodwill_message) formData.append('goodwill_message', v.goodwill_message)

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
        <Card>
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
                  <button
                    onClick={() => {
                      if (!currentRsvpStatus.qrImageUrl) return
                      const link = document.createElement('a')
                      link.href = currentRsvpStatus.qrImageUrl
                      link.download = `wedding-qr-code-${currentRsvpStatus.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.png`
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                      console.log('Calling toast for QR code save')
                      toast({
                        title: "QR Code Saved!",
                        description: "Your QR code has been downloaded to your device.",
                      })
                    }}
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-yellow-600 text-white hover:bg-yellow-700 h-10 px-4 py-2"
                  >
                    📱 Save QR Code
                  </button>
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
                    <button
                      onClick={() => {
                        if (!currentRsvpStatus.passUrl) return
                        const link = document.createElement('a')
                        link.href = currentRsvpStatus.passUrl
                        link.download = `wedding-pass-${currentRsvpStatus.guestName?.replace(/\s+/g, '-').toLowerCase() || 'guest'}.html`
                        document.body.appendChild(link)
                        link.click()
                        document.body.removeChild(link)
                        console.log('Calling toast for digital pass save')
                        toast({
                          title: "Digital Pass Saved!",
                          description: "Your wedding pass has been downloaded to your device.",
                        })
                      }}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                    >
                      💾 Save Digital Pass
                    </button>
                    <button
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
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 h-10 px-4 py-2"
                    >
                      📱 Add to Wallet
                    </button>
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
              <a 
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Back to Home
              </a>
            </div>
          </div>
        </Card>
      </Section>
    )
  }

  // Display declined RSVP status
  if (currentRsvpStatus && currentRsvpStatus.status === 'declined') {
    return (
      <Section title="RSVP" subtitle="We'll miss you!" narrow>
        <Card>
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
              <button
                onClick={() => setCurrentRsvpStatus(null)}
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Update RSVP
              </button>
              <a 
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Back to Home
              </a>
            </div>
          </div>
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
          <Card>
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
                    <button
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
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-yellow-600 text-white hover:bg-yellow-700 h-10 px-4 py-2"
                    >
                      📱 Save QR Code
                    </button>
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
                      <button
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
                        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-blue-600 text-white hover:bg-blue-700 h-10 px-4 py-2"
                      >
                        💾 Save Digital Pass
                      </button>
                      <button
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
                        className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 h-10 px-4 py-2"
                      >
                        📱 Add to Wallet
                      </button>
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
                <a 
                  href="/"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                >
                  Back to Home
                </a>
              </div>
            </div>
          </Card>
          {showConfetti && <RsvpConfetti onComplete={() => setShowConfetti(false)} />}
        </Section>
      )
    } else {
      return (
        <Section title="RSVP" subtitle="Thank you for letting us know" narrow>
          <Card>
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
          </Card>
        </Section>
      )
    }
  }

  // Check if RSVP is allowed based on configuration
  const rsvpCheck = config ? isRsvpAllowed(config) : { allowed: true }
  const timeRemaining = config ? getTimeUntilCutoff(config) : { hasDeadline: false, isPast: false }

  // If RSVP is not allowed, show a message
  if (!rsvpCheck.allowed && config) {
    return (
      <Section title="RSVP" subtitle="RSVP is currently closed" narrow>
        <Card>
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
              <a 
                href="/"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
              >
                Back to Home
              </a>
              <a 
                href="mailto:bidiamond2025@gmail.com"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              >
                Contact Us
              </a>
            </div>
          </div>
        </Card>
      </Section>
    )
  }

  return (
    <Section title="RSVP" subtitle="Enter the invite code from your card or email" narrow>
      <Card>
        {/* RSVP Deadline Warning */}
        {timeRemaining.hasDeadline && !timeRemaining.isPast && timeRemaining.formattedTime && (
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
            <div>
              <label htmlFor="invite_code" className="block text-sm font-medium text-gray-700 mb-2">
                Invite Code *
              </label>
              <Input 
                id="invite_code"
                required 
                placeholder="Enter your invite code" 
                {...register('invite_code', { required: 'Invite code is required' })}
                className={errors.invite_code ? 'border-red-500' : ''}
              />
              {errors.invite_code && (
                <p className="mt-1 text-sm text-red-600">{errors.invite_code.message}</p>
              )}
              {prefilledInviteCode && inviteCode !== prefilledInviteCode && (
                <p className="mt-1 text-sm text-amber-600">
                  ⚠️ You've changed the invite code. Make sure it's correct before submitting.
                </p>
              )}
            </div>

          {/* Response */}
          <div>
            <label htmlFor="response" className="block text-sm font-medium text-gray-700 mb-2">
              Will you be joining us? *
            </label>
            <Select onValueChange={(v) => setValue('response', v as 'accepted' | 'declined')} defaultValue="accepted">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose your response" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="accepted">Accept with joy ✨</SelectItem>
                <SelectItem value="declined">Regretfully decline</SelectItem>
              </SelectContent>
            </Select>
            {errors.response && (
              <p className="mt-1 text-sm text-red-600">{errors.response.message}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email (to receive confirmation & QR code)
            </label>
            <Input 
              id="email"
              type="email" 
              placeholder="you@example.com" 
              {...register('email')}
              className={errors.email ? 'border-red-500' : ''}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Goodwill Message (only shown when declined) */}
          {showGoodwillMessage && (
            <div>
              <label htmlFor="goodwill_message" className="block text-sm font-medium text-gray-700 mb-2">
                Send a message to the couple (optional)
              </label>
              <Textarea 
                id="goodwill_message"
                rows={4} 
                placeholder="We'd love to hear from you..."
                {...register('goodwill_message')}
                className={errors.goodwill_message ? 'border-red-500' : ''}
              />
              {errors.goodwill_message && (
                <p className="mt-1 text-sm text-red-600">{errors.goodwill_message.message}</p>
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

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button type="submit" variant="gold" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting…' : 'Submit RSVP'}
            </Button>
          </div>
        </form>
        )}
      </Card>
    </Section>
  )
}
