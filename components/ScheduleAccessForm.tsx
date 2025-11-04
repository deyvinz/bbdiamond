'use client'

import { useState } from 'react'
import { Button, Card, CardBody, CardHeader } from '@heroui/react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
      <Card className="w-full max-w-md border border-gray-200 shadow-lg rounded-3xl" radius="lg">
        <CardHeader className="text-center pt-8 pb-4">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#C8A951]/10">
            <Lock className="h-8 w-8 text-[#C8A951]" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-[#1E1E1E]">Wedding Schedule</h2>
          <p className="text-gray-600 mt-2 text-sm">
            Enter your invite code to access the wedding schedule and event details.
          </p>
        </CardHeader>
        <CardBody className="px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-code">Invite Code</Label>
              <Input
                id="invite-code"
                type="text"
                placeholder="Enter your invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="text-center text-lg tracking-wider rounded-xl"
                disabled={isLoading}
                autoComplete="off"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full bg-[#C8A951] text-white hover:bg-[#B38D39]"
              isLoading={isLoading}
              radius="lg"
              startContent={!isLoading && <Calendar className="h-4 w-4" />}
            >
              {isLoading ? 'Verifying...' : 'Access Schedule'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-600">
                <p className="font-medium mb-1">Don't have an invite code?</p>
                <p>Your invite code was included in your wedding invitation. If you can't find it, please contact the couple directly.</p>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
