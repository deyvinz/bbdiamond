'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/components/ui/use-toast'
import { runBackfillInviteCodesAction, checkBackfillLockStatus } from '@/lib/actions/backfill-invite-codes'
import { BackfillResult } from '@/lib/guests-service-server'
import { Download, Loader2 } from 'lucide-react'

interface BackfillInviteCodesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BackfillInviteCodesDialog({ open, onOpenChange }: BackfillInviteCodesDialogProps) {
  const [dryRun, setDryRun] = useState(true)
  const [batchSize, setBatchSize] = useState(500)
  const [maxRetries, setMaxRetries] = useState(5)
  const [confirmationText, setConfirmationText] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentStep, setCurrentStep] = useState('')
  const [result, setResult] = useState<BackfillResult | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const { toast } = useToast()

  const handleStart = async () => {
    if (!dryRun && confirmationText !== 'BACKFILL') {
      toast({
        title: "Confirmation required",
        description: "Please type 'BACKFILL' to confirm the operation",
        variant: "destructive",
      })
      return
    }

    setIsRunning(true)
    setProgress(0)
    setResult(null)
    setCurrentStep('Preparing...')

    try {
      // Check lock status
      const locked = await checkBackfillLockStatus()
      if (locked) {
        setIsLocked(true)
        toast({
          title: "Operation in progress",
          description: "Another backfill is currently running. Please try again later.",
          variant: "destructive",
        })
        return
      }

      setCurrentStep('Scanning guests...')
      setProgress(25)

      const formData = new FormData()
      formData.append('dryRun', dryRun.toString())
      formData.append('batchSize', batchSize.toString())
      formData.append('maxRetries', maxRetries.toString())

      setCurrentStep('Generating codes...')
      setProgress(50)

      const response = await runBackfillInviteCodesAction(formData)

      setCurrentStep('Finalizing...')
      setProgress(75)

      if (response.success) {
        setResult(response.result)
        setProgress(100)
        setCurrentStep('Complete!')
        
        toast({
          title: "Backfill completed",
          description: response.message,
        })
      } else {
        throw new Error('Backfill failed')
      }
    } catch (error) {
      console.error('Backfill error:', error)
      toast({
        title: "Backfill failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      })
    } finally {
      setIsRunning(false)
      setCurrentStep('')
    }
  }

  const handleDownloadCSV = () => {
    if (!result?.rows.length) return

    const csvContent = [
      'Guest ID,Email,Invite Code,Retries,Status,Error',
      ...result.rows.map(row => 
        `${row.guest_id},${row.email},${row.invite_code},${row.retries},${row.status},${row.error || ''}`
      )
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backfill-invite-codes-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleClose = () => {
    if (!isRunning) {
      setResult(null)
      setConfirmationText('')
      setProgress(0)
      setCurrentStep('')
      setIsLocked(false)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Backfill Invite Codes</DialogTitle>
          <DialogDescription>
            Generate invite codes for guests who don't have them. This operation can be run in dry-run mode to preview changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dry Run Toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="dryRun"
              checked={dryRun}
              onCheckedChange={(checked) => setDryRun(checked as boolean)}
            />
            <Label htmlFor="dryRun" className="text-sm font-medium">
              Dry run (preview only, no changes will be made)
            </Label>
          </div>

          {/* Batch Size */}
          <div className="space-y-2">
            <Label htmlFor="batchSize">Batch Size</Label>
            <Input
              id="batchSize"
              type="number"
              min="50"
              max="5000"
              value={batchSize}
              onChange={(e) => setBatchSize(parseInt(e.target.value) || 500)}
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground">
              Number of guests to process (50-5000)
            </p>
          </div>

          {/* Max Retries */}
          <div className="space-y-2">
            <Label htmlFor="maxRetries">Max Retries per Guest</Label>
            <Input
              id="maxRetries"
              type="number"
              min="1"
              max="10"
              value={maxRetries}
              onChange={(e) => setMaxRetries(parseInt(e.target.value) || 5)}
              disabled={isRunning}
            />
            <p className="text-xs text-muted-foreground">
              Number of retry attempts for unique constraint conflicts (1-10)
            </p>
          </div>

          {/* Confirmation for non-dry run */}
          {!dryRun && (
            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Type "BACKFILL" to confirm this operation will modify data
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="BACKFILL"
                disabled={isRunning}
              />
            </div>
          )}

          {/* Progress */}
          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{currentStep}</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Backfill Results</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Updated:</span> {result.updated}
                </div>
                <div>
                  <span className="font-medium">Skipped:</span> {result.skipped}
                </div>
                <div>
                  <span className="font-medium">Conflicts Resolved:</span> {result.conflictsResolved}
                </div>
                <div>
                  <span className="font-medium">Total Processed:</span> {result.rows.length}
                </div>
              </div>
              
              {result.rows.length > 0 && (
                <Button
                  onClick={handleDownloadCSV}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV Results
                </Button>
              )}
            </div>
          )}

          {/* Lock Warning */}
          {isLocked && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                Another backfill operation is currently running. Please wait for it to complete before starting a new one.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isRunning}
          >
            {result ? 'Close' : 'Cancel'}
          </Button>
          <Button
            onClick={handleStart}
            disabled={isRunning || isLocked}
            className="bg-gold-600 hover:bg-gold-700"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              'Start Backfill'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
