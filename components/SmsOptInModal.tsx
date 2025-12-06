'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from '@/components/ui/use-toast'
import { MessageSquare, Phone, Check } from 'lucide-react'

interface SmsOptInFormValues {
  phone_number: string
  first_name: string
  last_name: string
  consent: boolean
}

interface SmsOptInModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  coupleName?: string
}

export const SmsOptInModal = ({ open, onOpenChange, coupleName }: SmsOptInModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<SmsOptInFormValues>({
    defaultValues: {
      phone_number: '',
      first_name: '',
      last_name: '',
      consent: false,
    },
  })

  const consentChecked = watch('consent')

  const handleClose = () => {
    onOpenChange(false)
    // Reset form after modal closes
    setTimeout(() => {
      reset()
      setIsSuccess(false)
    }, 300)
  }

  const onSubmit = async (data: SmsOptInFormValues) => {
    if (!data.consent) {
      toast({
        title: 'Consent Required',
        description: 'Please check the consent checkbox to receive SMS notifications.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/sms-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: data.phone_number,
          first_name: data.first_name,
          last_name: data.last_name,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setIsSuccess(true)
        toast({
          title: 'Successfully Subscribed!',
          description: 'You will now receive SMS notifications about the wedding.',
        })
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to subscribe. Please try again.',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('SMS opt-in error:', error)
      toast({
        title: 'Error',
        description: 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const displayName = coupleName || 'the couple'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gold-100">
            <MessageSquare className="h-6 w-6 text-gold-600" aria-hidden="true" />
          </div>
          <DialogTitle className="text-center text-xl">
            {isSuccess ? "You're Subscribed!" : 'SMS Notifications'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {isSuccess
              ? `You'll receive text updates about ${displayName}'s wedding.`
              : `Get wedding updates and reminders via text message from ${displayName}.`}
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <Check className="h-8 w-8 text-green-600" aria-hidden="true" />
            </div>
            <p className="text-gray-600 text-sm">
              You can reply STOP at any time to unsubscribe from SMS notifications.
            </p>
            <Button onClick={handleClose} className="mt-6" variant="default">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="sms-phone">
                Phone Number <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Phone
                  className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <Input
                  id="sms-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  className={`pl-10 ${errors.phone_number ? 'border-red-500' : ''}`}
                  {...register('phone_number', {
                    required: 'Phone number is required',
                    pattern: {
                      value: /^[\d\s\-\+\(\)]+$/,
                      message: 'Please enter a valid phone number',
                    },
                    minLength: {
                      value: 10,
                      message: 'Phone number must be at least 10 digits',
                    },
                  })}
                  aria-describedby={errors.phone_number ? 'phone-error' : undefined}
                />
              </div>
              {errors.phone_number && (
                <p id="phone-error" className="text-sm text-red-600" role="alert">
                  {errors.phone_number.message}
                </p>
              )}
            </div>

            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sms-first-name">First Name</Label>
                <Input id="sms-first-name" type="text" placeholder="John" {...register('first_name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sms-last-name">Last Name</Label>
                <Input id="sms-last-name" type="text" placeholder="Doe" {...register('last_name')} />
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="flex items-start space-x-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
              <Checkbox
                id="sms-consent"
                checked={consentChecked}
                onCheckedChange={(checked) => setValue('consent', checked === true)}
                aria-describedby="consent-description"
              />
              <div className="space-y-1">
                <Label htmlFor="sms-consent" className="text-sm font-medium leading-tight cursor-pointer">
                  I agree to receive SMS notifications <span className="text-red-500">*</span>
                </Label>
                <p id="consent-description" className="text-xs text-gray-500 leading-relaxed">
                  By checking this box, you consent to receive text messages about wedding updates, reminders,
                  and announcements. Message and data rates may apply. Reply STOP to unsubscribe at any time.
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={handleClose} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !consentChecked} className="w-full sm:w-auto">
                {isSubmitting ? 'Subscribing...' : 'Subscribe to SMS'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

