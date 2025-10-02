'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/ui/use-toast'
import { QrCode, UserCheck, Users, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react'

interface CheckInStats {
  total_invited: number
  total_checked_in: number
  checkin_rate: number
  recent_checkins: Array<{
    guest_name: string
    event_name: string
    checked_in_at: string
    method: string
  }>
}

interface Event {
  id: string
  name: string
  starts_at: string
  venue: string
}

export default function CheckInPage() {
  const [isScanning, setIsScanning] = useState(false)
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info')
  const [stats, setStats] = useState<CheckInStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [selectedEvent, setSelectedEvent] = useState<string>('')
  const [manualInviteCode, setManualInviteCode] = useState('')
  const [manualNotes, setManualNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const qrCodeRegionId = 'qr-reader'

  useEffect(() => {
    loadEvents()
    loadStats()
  }, [])

  const loadEvents = async () => {
    try {
      const response = await fetch('/api/events')
      const data = await response.json()
      
      // The events API now returns { success: true, events: [...], total_count: ... }
      if (data.success && data.events && Array.isArray(data.events)) {
        setEvents(data.events)
        if (data.events.length > 0) {
          setSelectedEvent(data.events[0].id)
        }
      } else {
        console.error('Failed to load events:', data.error || 'Unknown error')
      }
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }

  const loadStats = async () => {
    try {
      const response = await fetch('/api/admin/checkin')
      const data = await response.json()
      if (data.success) {
        setStats(data.stats)
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const startScanning = () => {
    if (scanner) {
      scanner.clear()
    }

    const newScanner = new Html5QrcodeScanner(
      qrCodeRegionId,
      {
        qrbox: { width: 250, height: 250 },
        fps: 5,
        aspectRatio: 1.0,
      },
      false
    )

    newScanner.render(
      (decodedText) => {
        handleCheckIn(decodedText)
        newScanner.clear()
        setIsScanning(false)
        setScanner(null)
      },
      (error) => {
        // Handle scan errors silently
      }
    )

    setScanner(newScanner)
    setIsScanning(true)
  }

  const stopScanning = () => {
    if (scanner) {
      scanner.clear()
      setScanner(null)
    }
    setIsScanning(false)
  }

  const handleCheckIn = async (token: string) => {
    setIsLoading(true)
    setMessage('')
    
    try {
      const response = await fetch('/api/admin/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.guest_name} checked in successfully!`)
        setMessageType('success')
        toast({
          title: "Check-in Successful",
          description: `${data.guest_name} has been checked in for ${data.event_name}`,
        })
      } else {
        setMessage(`✗ ${data.message}`)
        setMessageType('error')
        toast({
          title: "Check-in Failed",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      setMessage('✗ Error checking in guest')
      setMessageType('error')
      toast({
        title: "Error",
        description: "Failed to check in guest. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      loadStats() // Refresh stats
    }
  }

  const handleManualCheckIn = async () => {
    if (!manualInviteCode.trim() || !selectedEvent) {
      toast({
        title: "Missing Information",
        description: "Please enter an invite code and select an event.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    
    try {
      const response = await fetch('/api/admin/checkin/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invite_code: manualInviteCode,
          event_id: selectedEvent,
          notes: manualNotes
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage(`✓ ${data.guest_name} checked in manually!`)
        setMessageType('success')
        setManualInviteCode('')
        setManualNotes('')
        toast({
          title: "Manual Check-in Successful",
          description: `${data.guest_name} has been checked in for ${data.event_name}`,
        })
      } else {
        setMessage(`✗ ${data.message}`)
        setMessageType('error')
        toast({
          title: "Manual Check-in Failed",
          description: data.message,
          variant: "destructive",
        })
      }
    } catch (error) {
      setMessage('✗ Error checking in guest manually')
      setMessageType('error')
      toast({
        title: "Error",
        description: "Failed to check in guest manually. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      loadStats() // Refresh stats
    }
  }

  const getMessageIcon = () => {
    switch (messageType) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />
      default:
        return <AlertCircle className="h-5 w-5 text-blue-600" />
    }
  }

  const getMessageColor = () => {
    switch (messageType) {
      case 'success':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'error':
        return 'text-red-700 bg-red-50 border-red-200'
      default:
        return 'text-blue-700 bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
            <div className="text-center lg:text-left">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-gray-900 mb-2">Guest Check-In</h1>
              <p className="text-base sm:text-lg text-gray-600">Scan QR codes or manually check in guests</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Invited</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_invited}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Checked In</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.total_checked_in}</p>
                  </div>
                  <UserCheck className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Check-in Rate</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.checkin_rate}%</p>
                  </div>
                  <Clock className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* QR Code Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                QR Code Scanner
              </CardTitle>
              <CardDescription>
                Scan guest QR codes for automatic check-in
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isScanning ? (
                <Button 
                  onClick={startScanning}
                  className="w-full"
                  size="lg"
                >
                  <QrCode className="h-4 w-4 mr-2" />
                  Start Scanning
                </Button>
              ) : (
                <Button 
                  onClick={stopScanning}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  Stop Scanning
                </Button>
              )}

              <div id={qrCodeRegionId} className="w-full"></div>

              {message && (
                <div className={`p-4 rounded-lg border flex items-center gap-2 ${getMessageColor()}`}>
                  {getMessageIcon()}
                  <span className="font-medium">{message}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manual Check-in */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Manual Check-in
              </CardTitle>
              <CardDescription>
                Check in guests manually using invite codes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="event-select">Event</Label>
                <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an event" />
                  </SelectTrigger>
                  <SelectContent>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name} - {new Date(event.starts_at).toLocaleDateString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invite-code">Invite Code</Label>
                <Input
                  id="invite-code"
                  placeholder="Enter guest invite code"
                  value={manualInviteCode}
                  onChange={(e) => setManualInviteCode(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about this check-in..."
                  value={manualNotes}
                  onChange={(e) => setManualNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <Button 
                onClick={handleManualCheckIn}
                disabled={isLoading || !manualInviteCode.trim() || !selectedEvent}
                className="w-full"
                size="lg"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                {isLoading ? 'Checking In...' : 'Check In Manually'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Check-ins */}
        {stats && stats.recent_checkins.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Check-ins</CardTitle>
              <CardDescription>
                Latest guest check-ins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recent_checkins.map((checkin, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium">{checkin.guest_name}</p>
                        <p className="text-sm text-gray-600">{checkin.event_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="mb-1">
                        {checkin.method === 'qr_code' ? 'QR Code' : 'Manual'}
                      </Badge>
                      <p className="text-sm text-gray-600">
                        {new Date(checkin.checked_in_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
