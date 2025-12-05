'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Trash2, CheckCircle, XCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface CleanupDuplicatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

interface DuplicateGroup {
  email: string
  count: number
  guests: Array<{
    id: string
    email: string
    first_name: string
    last_name: string
    created_at: string
  }>
}

interface CleanupResult {
  duplicatesFound: number
  guestsRemoved: number
  guestsKept: number
  errors: Array<{ guestId: string; error: string }>
  details: Array<{
    email: string
    removed: Array<{ id: string; email: string; name: string }>
    kept: { id: string; email: string; name: string }
  }>
  dryRun?: boolean
}

export default function CleanupDuplicatesDialog({
  open,
  onOpenChange,
  onComplete,
}: CleanupDuplicatesDialogProps) {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [result, setResult] = useState<CleanupResult | null>(null)
  const { toast } = useToast()

  // Scan for duplicates when dialog opens
  const handleScan = async () => {
    setScanning(true)
    setDuplicates([])
    setResult(null)

    try {
      const response = await fetch('/api/admin/guests/duplicates')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan for duplicates')
      }

      setDuplicates(data.duplicates || [])

      if (data.duplicates.length === 0) {
        toast({
          title: '✅ No Duplicates Found',
          description: 'All guest emails are unique!',
        })
      } else {
        toast({
          title: `⚠️ Found ${data.duplicates.length} Duplicate Email(s)`,
          description: `${data.totalDuplicateGuests} guest(s) will be removed`,
        })
      }
    } catch (error) {
      console.error('Error scanning for duplicates:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scan for duplicates',
        variant: 'destructive',
      })
    } finally {
      setScanning(false)
    }
  }

  const handleCleanup = async (dryRun: boolean) => {
    if (!dryRun) {
      const confirmed = confirm(
        `⚠️ WARNING: DESTRUCTIVE ACTION\n\n` +
        `This will permanently delete ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicate guest(s) from the database.\n\n` +
        `Deletion Priority:\n` +
        `1. Emails in ALL UPPERCASE will be removed first\n` +
        `2. Otherwise, the OLDEST guest (by creation date) will be kept\n\n` +
        `Are you absolutely sure you want to proceed?`
      )

      if (!confirmed) {
        return
      }
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/guests/duplicates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cleanup duplicates')
      }

      setResult(data)

      if (dryRun) {
        toast({
          title: '📋 Dry Run Complete',
          description: `Would remove ${data.guestsRemoved} duplicate(s) and keep ${data.guestsKept} guest(s)`,
        })
      } else {
        toast({
          title: '✅ Cleanup Complete!',
          description: `Removed ${data.guestsRemoved} duplicate(s), kept ${data.guestsKept} guest(s)${data.errors.length > 0 ? `, ${data.errors.length} errors` : ''}`,
        })

        if (data.errors.length > 0) {
          console.error('Cleanup errors:', data.errors)
          toast({
            title: 'Some Errors Occurred',
            description: `Check console for details. ${data.errors.length} guests failed to delete.`,
            variant: 'destructive',
          })
        }

        // Rescan after cleanup
        setTimeout(() => {
          handleScan()
          onComplete()
        }, 1000)
      }
    } catch (error) {
      console.error('Error cleaning up duplicates:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cleanup duplicates',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setDuplicates([])
    setResult(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-orange-600" />
            Cleanup Duplicate Emails
          </DialogTitle>
          <DialogDescription>
            Remove duplicate guest email addresses from the database
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Warning Banner */}
          <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-orange-900 mb-2">⚠️ Duplicate Removal Policy</h4>
                <ul className="text-sm text-orange-800 space-y-1">
                  <li>• <strong>UPPERCASE emails</strong> will be removed first if duplicates exist</li>
                  <li>• Otherwise, the <strong>oldest guest</strong> (by creation date) will be kept</li>
                  <li>• Associated invitations will also be deleted</li>
                  <li>• This action is <strong>permanent and cannot be undone</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scan Button */}
          {duplicates.length === 0 && !result && (
            <div className="text-center py-8">
              <Button
                onClick={handleScan}
                disabled={scanning}
                size="lg"
                variant="outline"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2"></div>
                    Scanning for Duplicates...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Scan for Duplicate Emails
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Duplicates List */}
          {duplicates.length > 0 && (
            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-900 font-semibold">
                  Found {duplicates.length} duplicate email(s) affecting {duplicates.reduce((sum, d) => sum + d.count, 0)} guest(s)
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {duplicates.map((dup, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{dup.email}</h4>
                      <span className="text-sm text-red-600 font-medium">
                        {dup.count} duplicates
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dup.guests.map((guest, gIdx) => {
                        const isKeep = gIdx === 0
                        const isUppercase = guest.email === guest.email.toUpperCase()
                        return (
                          <div
                            key={guest.id}
                            className={`flex items-center gap-3 p-2 rounded ${
                              isKeep
                                ? 'bg-green-50 border border-green-200'
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            {isKeep ? (
                              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                            )}
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {guest.first_name} {guest.last_name || ''}
                                {isUppercase && (
                                  <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded">
                                    UPPERCASE
                                  </span>
                                )}
                              </p>
                              <p className="text-xs text-gray-600">
                                {guest.email} • Created: {new Date(guest.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold ${
                              isKeep ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {isKeep ? 'KEEP' : 'REMOVE'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result Display */}
          {result && (
            <div className="space-y-4">
              <div className={`border rounded-lg p-4 ${
                result.errors.length > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200'
              }`}>
                <div className="flex items-center gap-3 mb-3">
                  {result.errors.length > 0 ? (
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <h4 className="font-semibold text-gray-900">
                    Cleanup {result.dryRun ? 'Preview' : 'Complete'}
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Duplicates Found</p>
                    <p className="font-semibold text-lg">{result.duplicatesFound}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Guests Removed</p>
                    <p className="font-semibold text-lg text-red-600">{result.guestsRemoved}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Guests Kept</p>
                    <p className="font-semibold text-lg text-green-600">{result.guestsKept}</p>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <p className="mt-3 text-sm text-yellow-800">
                    ⚠️ {result.errors.length} error(s) occurred. Check console for details.
                  </p>
                )}
              </div>

              {!result.dryRun && (
                <Button onClick={handleScan} variant="outline" className="w-full">
                  Scan Again
                </Button>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading || scanning}
          >
            Close
          </Button>
          {duplicates.length > 0 && !result && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleCleanup(true)}
                disabled={loading || scanning}
              >
                Preview Cleanup (Dry Run)
              </Button>
              <Button
                type="button"
                onClick={() => handleCleanup(false)}
                disabled={loading || scanning}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Cleaning Up...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cleanup Duplicates
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

