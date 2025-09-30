'use client'

import { useState, useEffect } from 'react'
import { useToast } from '@/components/ui/use-toast'
import Section from '@/components/Section'
import Card from '@/components/Card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Users, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import GuestSeatingInfo from '@/components/GuestSeatingInfo'

export default function SeatingPage() {
  const [inviteCode, setInviteCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [guest, setGuest] = useState<any>(null)
  const { toast } = useToast()

  // Check for existing authentication on mount
  useEffect(() => {
    const savedGuest = sessionStorage.getItem('schedule-guest')
    if (savedGuest) {
      try {
        const guestData = JSON.parse(savedGuest)
        setGuest(guestData)
        setIsAuthenticated(true)
        setInviteCode(guestData.invite_code)
      } catch (error) {
        console.error('Error parsing saved guest data:', error)
        sessionStorage.removeItem('schedule-guest')
      }
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!inviteCode.trim()) {
      toast({
        title: "Invite Code Required",
        description: "Please enter your invite code to view seating information.",
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
        const guestData = data.guest
        setGuest(guestData)
        setIsAuthenticated(true)
        sessionStorage.setItem('schedule-guest', JSON.stringify(guestData))
        
        toast({
          title: "Access Granted! 🎉",
          description: `Welcome, ${guestData.first_name}! You can now view your seating assignment.`,
        })
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

  const handleLogout = () => {
    sessionStorage.removeItem('schedule-guest')
    setGuest(null)
    setIsAuthenticated(false)
    setInviteCode('')
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <Section title="Seating Chart" subtitle="Find your assigned seat">
        <div className="max-w-md mx-auto">
          <Card className="p-6">
            <div className="text-center mb-6">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gold-100">
                <Lock className="h-8 w-8 text-gold-600" />
              </div>
              <h3 className="text-xl font-serif mb-2">View Your Seating</h3>
              <p className="text-gray-600">
                Enter your invite code to see your assigned table and seat.
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invite-code">Invite Code</Label>
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
                className="w-full bg-gold-600 hover:bg-gold-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Users className="h-4 w-4 mr-2" />
                    View Seating
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

            <div className="mt-4 text-center">
              <Link 
                href="/" 
                className="inline-flex items-center text-sm text-gold-600 hover:text-gold-700"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Home
              </Link>
            </div>
          </Card>
        </div>
      </Section>
    )
  }

  // Show seating information
  return (
    <Section title="Seating Chart" subtitle="Your assigned seat">
      <div className="mb-4 flex justify-between items-center">
        <div className="p-3 bg-gold-50 rounded-lg border border-gold-200">
          <p className="text-sm text-gold-800">
            <span className="font-medium">Welcome, {guest?.first_name}!</span> Here's your seating assignment.
          </p>
        </div>
        <Button variant="outline" onClick={handleLogout}>
          <Lock className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
      
      <GuestSeatingInfo 
        inviteCode={guest?.invite_code || ''} 
        guestName={guest?.first_name}
      />

      <div className="mt-6 text-center">
        <Link 
          href="/" 
          className="inline-flex items-center text-sm text-gold-600 hover:text-gold-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Home
        </Link>
      </div>
    </Section>
  )
}
