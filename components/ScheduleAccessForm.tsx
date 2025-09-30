'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Lock, Calendar, Users } from 'lucide-react'

interface ScheduleAccessFormProps {
  onAccessGranted: (guest: any) => void
}

export default function ScheduleAccessForm({ onAccessGranted }: ScheduleAccessFormProps) {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inviteCode.trim()) {
      toast({
        title: "Invite Code Required",
        description: "Please enter your invite code to access the schedule.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/schedule/validate-invite-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invite_code: inviteCode.trim() }),
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: "Access Granted! 🎉",
          description: `Welcome, ${data.guest.first_name}! You can now view the wedding schedule.`,
        })
        onAccessGranted(data.guest)
      } else {
        toast({
          title: "Invalid Invite Code",
          description: data.message || "Please check your invite code and try again.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error validating invite code:', error)
      toast({
        title: "Error",
        description: "Failed to validate invite code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
            <Lock className="h-8 w-8 text-gold-600" />
          </div>
          <CardTitle className="text-2xl font-serif">Wedding Schedule</CardTitle>
          <p className="text-gray-600 mt-2">
            Enter your invite code to access the wedding schedule and event details.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="invite-code" className="text-sm font-medium text-gray-700">
                Invite Code
              </label>
              <Input
                id="invite-code"
                type="text"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="text-center text-lg tracking-wider"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-gold-600 text-white hover:bg-gold-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Access Schedule
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-500 mt-0.5" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Don't have an invite code?</p>
                <p>Your invite code was included in your wedding invitation. If you can't find it, please contact the couple directly.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
