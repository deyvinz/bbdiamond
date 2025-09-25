"use client"
import { Guest } from '@/lib/types/guests'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import type { ConfigValue } from '@/lib/types/config'

interface GuestDetailsDialogProps {
  open: boolean
  guest?: Guest
  config?: ConfigValue
  onOpenChange: (open: boolean) => void
}

export default function GuestDetailsDialog({ open, guest, config, onOpenChange }: GuestDetailsDialogProps) {
  if (!guest) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="font-serif text-xl">{guest.first_name} {guest.last_name}</span>
            {guest.is_vip && <Badge className="bg-gold-600 text-white">VIP</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <section>
            <h3 className="font-medium mb-2">Contact</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-black/60">Email</div>
                <div>{guest.email}</div>
              </div>
              <div>
                <div className="text-black/60">Phone</div>
                <div>{guest.phone || '-'}</div>
              </div>
              <div>
                <div className="text-black/60">Household</div>
                <div>{guest.household?.name || '-'}</div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">RSVP</h3>
            <div className="text-sm">
              {guest.latest_rsvp ? (
                <div className="flex items-center gap-2">
                  <div>{guest.latest_rsvp.status}</div>
                  <div className="text-black/60">{(guest as any).latest_rsvp?.party_size ? `(${(guest as any).latest_rsvp.party_size})` : ''}</div>
                </div>
              ) : (
                <div className="text-black/60">No RSVP yet</div>
              )}
            </div>
          </section>

          <section>
            <h3 className="font-medium mb-2">Invitations & Events</h3>
            <div className="space-y-3">
              {guest.invitations?.length ? guest.invitations.map((inv: any) => (
                <div key={inv.id} className="rounded-md border p-3">
                  <div className="text-xs text-black/60 mb-2">Token: {inv.token}</div>
                  <div className="space-y-2">
                    {(inv.invitation_events || []).map((ie: any) => (
                      <div key={ie.id} className="flex items-center justify-between text-sm">
                        <div>
                          <div className="font-medium">{ie.event?.name || 'Event'}</div>
                          <div className="text-black/60">
                            Headcount: {config?.plus_ones_enabled ? (ie.headcount ?? '-') : 1}
                            {!config?.plus_ones_enabled && (
                              <span className="text-xs text-gray-500 ml-1">(Fixed - Plus-ones disabled)</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <Badge variant="outline" className="border-gold-200 text-gold-700">{ie.status || 'pending'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-sm text-black/60">No invitations</div>
              )}
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}


