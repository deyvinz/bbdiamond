'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Download, Loader2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

interface ExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  events: any[]
}

const GUEST_COLUMNS = [
  { id: 'first_name', label: 'First Name', default: true },
  { id: 'last_name', label: 'Last Name', default: true },
  { id: 'email', label: 'Email', default: true },
  { id: 'invite_code', label: 'Invite Code', default: true },
  { id: 'events', label: 'Events', default: true },
  { id: 'rsvp_status', label: 'RSVP Status', default: true },
  { id: 'headcount', label: 'Headcount', default: true },
  { id: 'dietary_restrictions', label: 'Dietary Restrictions', default: false },
  { id: 'dietary_information', label: 'Dietary Information', default: false },
  { id: 'food_choice', label: 'Food Choice', default: false },
  { id: 'notes', label: 'Notes', default: false },
  { id: 'created_at', label: 'Created Date', default: false },
]

export default function ExportDialog({
  open,
  onOpenChange,
  events,
}: ExportDialogProps) {
  const [loading, setLoading] = useState(false)
  const [eventFilter, setEventFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    GUEST_COLUMNS.filter(col => col.default).map(col => col.id)
  )

  const handleToggleColumn = (columnId: string) => {
    setSelectedColumns(prev =>
      prev.includes(columnId)
        ? prev.filter(id => id !== columnId)
        : [...prev, columnId]
    )
  }

  const handleSelectAllColumns = () => {
    if (selectedColumns.length === GUEST_COLUMNS.length) {
      // Deselect all
      setSelectedColumns([])
    } else {
      // Select all
      setSelectedColumns(GUEST_COLUMNS.map(col => col.id))
    }
  }

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'No columns selected',
        description: 'Please select at least one column to export',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (eventFilter !== 'all') params.set('eventId', eventFilter)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('columns', selectedColumns.join(','))

      const response = await fetch(`/api/admin/guests/export?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error('Export failed')
      }

      // Get the CSV content
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `guests-export-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Export successful',
        description: 'Your guests have been exported to CSV',
      })

      onOpenChange(false)
    } catch (error) {
      console.error('Export error:', error)
      toast({
        title: 'Export failed',
        description: error instanceof Error ? error.message : 'Failed to export guests',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setEventFilter('all')
    setStatusFilter('all')
    setSelectedColumns(GUEST_COLUMNS.filter(col => col.default).map(col => col.id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Export Guests</DialogTitle>
          <DialogDescription>
            Select filters and columns to export guest data to CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Filters Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Filters</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-filter">Event</Label>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger id="event-filter">
                    <SelectValue placeholder="All Events" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Events</SelectItem>
                    {events.map((event) => (
                      <SelectItem key={event.id} value={event.id}>
                        {event.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-filter">RSVP Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="declined">Declined</SelectItem>
                    <SelectItem value="waitlist">Waitlist</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Columns Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Columns to Export</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAllColumns}
              >
                {selectedColumns.length === GUEST_COLUMNS.length ? 'Deselect All' : 'Select All'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border rounded-lg p-4 bg-muted/30">
              {GUEST_COLUMNS.map((column) => (
                <div key={column.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={column.id}
                    checked={selectedColumns.includes(column.id)}
                    onCheckedChange={() => handleToggleColumn(column.id)}
                  />
                  <Label
                    htmlFor={column.id}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {column.label}
                  </Label>
                </div>
              ))}
            </div>

            {selectedColumns.length === 0 && (
              <p className="text-sm text-destructive">
                Please select at least one column to export
              </p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Export Summary:</strong>
              <br />
              • Event: {eventFilter === 'all' ? 'All Events' : events.find(e => e.id === eventFilter)?.name || 'Unknown'}
              <br />
              • Status: {statusFilter === 'all' ? 'All Status' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
              <br />
              • Columns: {selectedColumns.length} selected
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading}
          >
            Reset Filters
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={loading || selectedColumns.length === 0}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

