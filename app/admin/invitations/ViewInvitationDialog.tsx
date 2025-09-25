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
  QrCode
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
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  )
}
