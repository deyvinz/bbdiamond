'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Mail, 
  Copy, 
  User,
  Users,
  QrCode,
  Utensils,
  MessageCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { toast } from '@/components/ui/use-toast'
import type { Invitation } from '@/lib/invitations-service'
import type { ConfigValue } from '@/lib/types/config'

interface ViewInvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invitation?: Invitation
  config?: ConfigValue
}

const statusColors = {
  pending: 'outline',
  accepted: 'default',
  declined: 'secondary',
  waitlist: 'outline',
}

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  declined: 'Declined',
  waitlist: 'Waitlist',
}

export default function ViewInvitationDialog({
  open,
  onOpenChange,
  invitation,
  config,
}: ViewInvitationDialogProps) {
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [sendingWhatsApp, setSendingWhatsApp] = useState(false)

  if (!invitation) return null

  const handleCopyInviteLink = (token: string) => {
    const url = `${window.location.origin}/rsvp?token=${token}`
    navigator.clipboard.writeText(url)
    setCopiedToken(token)
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    })
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleCopyEventToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast({
      title: "Copied!",
      description: "Event token copied to clipboard",
    })
  }

  const handleCopyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code)
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard",
    })
  }

  const handleSendWhatsApp = async () => {
    if (!invitation || !invitation.guest?.phone_number) {
      toast({
        title: "Error",
        description: "Guest phone number is required to send WhatsApp",
        variant: "destructive",
      })
      return
    }

    const eventIds = invitation.invitation_events?.map((ie: any) => ie.event_id) || []
    if (eventIds.length === 0) {
      toast({
        title: "Error",
        description: "No events found for this invitation",
        variant: "destructive",
      })
      return
    }

    setSendingWhatsApp(true)
    try {
      const response = await fetch('/api/admin/invitations/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invitationId: invitation.id,
          eventIds,
          phoneNumber: invitation.guest.phone_number,
        }),
      })

      const data = await response.json()
      if (data.success) {
        toast({
          title: "✅ WhatsApp Sent",
          description: "Invitation has been sent via WhatsApp",
        })
        onOpenChange(false)
      } else {
        throw new Error(data.error || 'Failed to send WhatsApp')
      }
    } catch (error) {
      console.error('Error sending WhatsApp:', error)
      toast({
        title: "❌ Send Failed",
        description: error instanceof Error ? error.message : "Failed to send WhatsApp invitation",
        variant: "destructive",
      })
    } finally {
      setSendingWhatsApp(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gold-700">
            Invitation Details
          </DialogTitle>
          <DialogDescription>
            View complete invitation information and event details
          </DialogDescription>
        </DialogHeader>

         <div className="space-y-10">
          {/* Guest Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Guest Information
              </CardTitle>
            </CardHeader>
             <CardContent className="space-y-6">
               <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div>
                  <label className="text-sm font-medium text-gray-500">Name</label>
                  <p className="text-lg font-semibold break-words">
                    {invitation.guest.first_name} {invitation.guest.last_name}
                    {invitation.guest.is_vip && (
                      <span className="ml-2 text-gold-600">★</span>
                    )}
                  </p>
                </div>
                <div className="xl:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-lg flex items-center gap-2 break-words">
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    <span className="break-all min-w-0">{invitation.guest.email}</span>
                  </p>
                </div>
                 <div>
                   <label className="text-sm font-medium text-gray-500">Invite Code</label>
                   <div className="flex items-center gap-2">
                     <p className="text-lg font-mono bg-gray-100 px-2 py-1 rounded flex-1">
                       {invitation.guest.invite_code}
                     </p>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => handleCopyInviteCode(invitation.guest.invite_code)}
                     >
                       <Copy className="h-4 w-4" />
                     </Button>
                   </div>
                 </div>
                 {invitation.guest.total_guests && (
                   <div>
                     <label className="text-sm font-medium text-gray-500">Total Guests (Household Size)</label>
                     <p className="text-lg font-semibold">
                       {invitation.guest.total_guests}
                       <span className="text-sm font-normal text-gray-500 ml-2">
                         (Max plus-ones: {invitation.guest.total_guests - 1})
                       </span>
                     </p>
                   </div>
                 )}
                <div className="xl:col-span-3">
                  <label className="text-sm font-medium text-gray-500">Invitation Token</label>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono bg-gray-100 px-2 py-1 rounded flex-1 break-all">
                      {invitation.token}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyInviteLink(invitation.token)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Events Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Events ({invitation.invitation_events.length})
              </CardTitle>
            </CardHeader>
             <CardContent className="space-y-8">
              {invitation.invitation_events.map((event, index) => (
                <div key={event.id}>
                  <Card className="border-l-4 border-l-gold-500">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-4 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="text-lg font-semibold break-words">{event.event.name}</h4>
                            <Badge
                              className={
                                event.status === 'accepted' 
                                  ? 'bg-green-100 text-green-800 border-green-300'
                                  : event.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                                  : event.status === 'declined'
                                  ? 'bg-gray-100 text-gray-800 border-gray-300'
                                  : 'bg-amber-100 text-amber-800 border-amber-300'
                              }
                            >
                              {statusLabels[event.status]}
                            </Badge>
                          </div>
                          
                           <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            <div className="space-y-3 min-w-0">
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="break-words min-w-0">{format(new Date(event.event.starts_at), 'EEEE, MMMM d, yyyy')}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <Clock className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="break-words min-w-0">{format(new Date(event.event.starts_at), 'h:mm a')}</span>
                              </div>
                              <div className="flex items-start gap-2 text-sm text-gray-600">
                                <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                                <span className="break-words min-w-0">{event.event.venue}</span>
                              </div>
                              {event.event.address && (
                                <div className="text-sm text-gray-500 ml-6 break-words min-w-0">
                                  {event.event.address}
                                </div>
                              )}
                            </div>
                            
                            <div className="space-y-3 min-w-0">
                              <div className="flex items-start gap-2">
                                <Users className="h-4 w-4 text-gray-500 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <span className="text-sm font-medium">Headcount:</span>
                                  <span className="text-sm ml-1">
                                    {config?.plus_ones_enabled ? event.headcount : 1}
                                    {!config?.plus_ones_enabled && (
                                      <span className="text-xs text-gray-500 ml-1">(Fixed - Plus-ones disabled)</span>
                                    )}
                                  </span>
                                  {invitation.guest.total_guests && config?.plus_ones_enabled && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Max allowed: {invitation.guest.total_guests} (based on guest's total_guests)
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="space-y-2 min-w-0">
                                <div className="flex items-center gap-2">
                                  <QrCode className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                  <span className="text-sm font-medium">Event Token:</span>
                                </div>
                                <div className="flex items-center gap-1 ml-6 min-w-0">
                                  <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded break-all flex-1 min-w-0">
                                    {event.event_token}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 flex-shrink-0"
                                    onClick={() => handleCopyEventToken(event.event_token)}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* RSVP Information */}
                          {event.latest_rsvp && (
                            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">Latest RSVP</h5>
                               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div className="break-words">
                                  <span className="font-medium">Response:</span> {event.latest_rsvp.response}
                                </div>
                                <div className="break-words">
                                  <span className="font-medium">Party Size:</span> {event.latest_rsvp.party_size}
                                </div>
                                <div className="break-words">
                                  <span className="font-medium">Date:</span> {format(new Date(event.latest_rsvp.created_at), 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Dietary Information - Show only if event is accepted and dietary data exists */}
                          {event.status === 'accepted' && (event.dietary_restrictions || event.dietary_information || event.food_choice || (event.rsvp_guests && event.rsvp_guests.length > 0)) && (
                            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                              <h5 className="text-sm font-medium text-amber-900 mb-3 flex items-center gap-2">
                                <Utensils className="h-4 w-4" />
                                Dietary Information
                              </h5>
                              <div className="space-y-3 text-sm">
                                {/* Multiple Guests Food Choices */}
                                {event.rsvp_guests && event.rsvp_guests.length > 0 ? (
                                  <div className="space-y-2">
                                    <span className="font-medium text-amber-800">Guest Meal Selections:</span>
                                    {event.rsvp_guests.map((guest: any, idx: number) => (
                                      <div key={guest.id || idx} className="ml-4 p-2 bg-white rounded border border-amber-200">
                                        <div className="font-medium text-amber-900">
                                          {guest.guest_index === 1 
                                            ? 'Primary Guest' 
                                            : `Guest ${guest.guest_index}${guest.name ? ` (${guest.name})` : ''}`}
                                        </div>
                                        {guest.food_choice && (
                                          <div className="text-amber-800 mt-1">
                                            Meal: {guest.food_choice}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : event.food_choice ? (
                                  /* Single Guest Food Choice (backward compatibility) */
                                  <div className="break-words">
                                    <span className="font-medium text-amber-800">Meal Selection:</span>
                                    <span className="ml-2 text-amber-900">{event.food_choice}</span>
                                  </div>
                                ) : null}
                                {event.dietary_restrictions && (
                                  <div className="break-words">
                                    <span className="font-medium text-amber-800">Dietary Restrictions:</span>
                                    <p className="mt-1 text-amber-900 whitespace-pre-wrap">{event.dietary_restrictions}</p>
                                  </div>
                                )}
                                {event.dietary_information && (
                                  <div className="break-words">
                                    <span className="font-medium text-amber-800">Additional Dietary Information:</span>
                                    <p className="mt-1 text-amber-900 whitespace-pre-wrap">{event.dietary_information}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {index < invitation.invitation_events.length - 1 && (
                    <Separator className="my-4" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Invitation Links */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
             <CardContent>
               <div className="flex flex-wrap gap-4">
                <Button
                  variant="outline"
                  onClick={() => handleCopyInviteLink(invitation.token)}
                  className="flex items-center gap-2"
                >
                  <Copy className="h-4 w-4" />
                  Copy Invite Link
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(`/rsvp?token=${invitation.token}`, '_blank')}
                  className="flex items-center gap-2"
                >
                  <QrCode className="h-4 w-4" />
                  View RSVP Page
                </Button>
                {invitation.guest?.phone_number && (
                  <Button
                    variant="outline"
                    onClick={handleSendWhatsApp}
                    disabled={sendingWhatsApp}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    {sendingWhatsApp ? 'Sending...' : 'Send via WhatsApp'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
