'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertCircle, Wrench } from 'lucide-react'

interface FixHeadcountsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  loading?: boolean
}

export default function FixHeadcountsDialog({
  open,
  onOpenChange,
  onConfirm,
  loading = false,
}: FixHeadcountsDialogProps) {
  const handleConfirm = () => {
    onConfirm()
    // Don't close dialog here - let the parent handle it after action completes
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-600" />
            Fix Invitation Headcounts
          </DialogTitle>
          <DialogDescription>
            Update all invitation event headcounts to match each guest's total guest count
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning Banner */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <h4 className="font-semibold mb-2">What will be updated:</h4>
                <ul className="space-y-1 text-blue-800">
                  <li>• Headcounts will be adjusted based on guest's <strong>total_guests</strong> value</li>
                  <li>• Plus-ones configuration will be respected</li>
                  <li>• Maximum party size settings will be enforced</li>
                  <li>• Only invitation events with mismatched headcounts will be updated</li>
                </ul>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600">
            This action will scan all invitation events and update their headcounts to match each guest's configured total guest count according to your settings.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Processing...' : 'Fix Headcounts'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
