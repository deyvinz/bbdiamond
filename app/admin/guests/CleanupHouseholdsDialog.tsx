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
import { AlertCircle, Trash2, CheckCircle, XCircle, Home } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

interface CleanupHouseholdsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
}

interface DuplicateGroup {
  name: string
  count: number
  households: Array<{
    id: string
    name: string
    wedding_id: string
    created_at: string
    guest_count: number
  }>
}

interface OrphanedHousehold {
  id: string
  name: string
  wedding_id: string
  created_at: string
}

interface CleanupResult {
  duplicatesFound: number
  orphanedFound: number
  householdsRemoved: number
  householdsMerged: number
  guestsReassigned: number
  errors: Array<{ householdId: string; error: string }>
  details: Array<{
    type: 'duplicate' | 'orphaned'
    name: string
    removed: Array<{ id: string; name: string; guest_count: number }>
    kept?: { id: string; name: string; guest_count: number }
  }>
  dryRun?: boolean
}

export default function CleanupHouseholdsDialog({
  open,
  onOpenChange,
  onComplete,
}: CleanupHouseholdsDialogProps) {
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([])
  const [orphaned, setOrphaned] = useState<OrphanedHousehold[]>([])
  const [result, setResult] = useState<CleanupResult | null>(null)
  const { toast } = useToast()

  const handleClose = () => {
    if (!loading && !scanning) {
      setDuplicates([])
      setOrphaned([])
      setResult(null)
      onOpenChange(false)
    }
  }

  // Scan for duplicates and orphaned households when dialog opens
  const handleScan = async () => {
    setScanning(true)
    setDuplicates([])
    setOrphaned([])
    setResult(null)

    try {
      const response = await fetch('/api/admin/guests/households')
      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to scan for households')
      }

      setDuplicates(data.duplicates || [])
      setOrphaned(data.orphaned || [])

      const totalIssues = (data.totalDuplicates || 0) + (data.totalOrphaned || 0)

      if (totalIssues === 0) {
        toast({
          title: '✅ No Issues Found',
          description: 'All households are unique and have guests!',
        })
      } else {
        toast({
          title: `⚠️ Found Household Issues`,
          description: `${data.totalDuplicates || 0} duplicate(s) and ${data.totalOrphaned || 0} orphaned household(s)`,
        })
      }
    } catch (error) {
      console.error('Error scanning for households:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to scan for households',
        variant: 'destructive',
      })
    } finally {
      setScanning(false)
    }
  }

  const handleCleanup = async (dryRun: boolean) => {
    if (!dryRun) {
      const totalToRemove = duplicates.reduce((sum, d) => sum + d.count - 1, 0) + orphaned.length
      const confirmed = confirm(
        `⚠️ WARNING: DESTRUCTIVE ACTION\n\n` +
        `This will permanently remove ${totalToRemove} household(s) from the database.\n\n` +
        `Actions:\n` +
        `• ${duplicates.reduce((sum, d) => sum + d.count - 1, 0)} duplicate household(s) will be merged (guests reassigned)\n` +
        `• ${orphaned.length} orphaned household(s) (with no guests) will be deleted\n\n` +
        `Priority:\n` +
        `• For duplicates: Keep household with most guests (or oldest if tied)\n` +
        `• Guests from removed households will be reassigned to the kept household\n\n` +
        `Are you absolutely sure you want to proceed?`
      )

      if (!confirmed) {
        return
      }
    }

    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/admin/guests/households', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dryRun }),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to cleanup households')
      }

      setResult(data)

      if (dryRun) {
        toast({
          title: '✅ Preview Complete',
          description: `${data.householdsRemoved} household(s) would be removed`,
        })
      } else {
        toast({
          title: '✅ Cleanup Complete',
          description: `Removed ${data.householdsRemoved} household(s), reassigned ${data.guestsReassigned} guest(s)`,
        })
        onComplete()
      }
    } catch (error) {
      console.error('Error cleaning up households:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to cleanup households',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Auto-scan when dialog opens
  if (open && duplicates.length === 0 && orphaned.length === 0 && !result && !scanning) {
    handleScan()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Cleanup Duplicate & Orphaned Households
          </DialogTitle>
          <DialogDescription>
            Find and remove duplicate households (same name) and orphaned households (no guests).
            For duplicates, guests will be reassigned to the kept household.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-900">
                <p className="font-semibold mb-2">What will be cleaned up:</p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800">
                  <li>Duplicate households with the same name (case-insensitive)</li>
                  <li>Orphaned households with no associated guests</li>
                  <li>Guests from removed duplicate households will be reassigned to the kept household</li>
                  <li>This action is <strong>permanent and cannot be undone</strong></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Scan Button */}
          {(duplicates.length === 0 && orphaned.length === 0 && !result) && (
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
                    Scanning for Issues...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Scan for Duplicate & Orphaned Households
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
                  Found {duplicates.length} duplicate household name(s) affecting {duplicates.reduce((sum, d) => sum + d.count, 0)} household(s)
                </p>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {duplicates.map((dup, idx) => (
                  <div key={idx} className="bg-white border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-gray-900">{dup.name}</h4>
                      <span className="text-sm text-red-600 font-medium">
                        {dup.count} duplicates
                      </span>
                    </div>
                    <div className="space-y-2">
                      {dup.households.map((household, hIdx) => {
                        const isKeep = hIdx === 0
                        return (
                          <div
                            key={household.id}
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
                                {household.name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {household.guest_count} guest(s) • Created: {new Date(household.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`text-xs font-semibold ${
                              isKeep ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {isKeep ? 'KEEP' : 'MERGE'}
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

          {/* Orphaned List */}
          {orphaned.length > 0 && (
            <div className="space-y-4">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm text-orange-900 font-semibold">
                  Found {orphaned.length} orphaned household(s) with no guests
                </p>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-4 bg-gray-50">
                {orphaned.map((household) => (
                  <div
                    key={household.id}
                    className="bg-white border border-orange-200 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{household.name}</p>
                      <p className="text-xs text-gray-600">
                        Created: {new Date(household.created_at).toLocaleDateString()} • 0 guests
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-orange-700">
                      REMOVE
                    </span>
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
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Duplicates Found</p>
                    <p className="font-semibold text-lg">{result.duplicatesFound}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Orphaned Found</p>
                    <p className="font-semibold text-lg">{result.orphanedFound}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Households Removed</p>
                    <p className="font-semibold text-lg text-red-600">{result.householdsRemoved}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Guests Reassigned</p>
                    <p className="font-semibold text-lg text-green-600">{result.guestsReassigned}</p>
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
          {(duplicates.length > 0 || orphaned.length > 0) && !result && (
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
                    Cleanup Households
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

