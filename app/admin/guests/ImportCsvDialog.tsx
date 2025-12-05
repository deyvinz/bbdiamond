'use client'

import { useState, useCallback } from 'react'
import { expectedCsvColumns } from '@/lib/csv'
import { csvGuestSchema } from '@/lib/validators'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle, XCircle, Upload, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabase-browser'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

interface ValidationResult {
  row: number
  data: Record<string, any>
  valid: boolean
  errors: string[]
}

function ImportCsvDialog({ open, onOpenChange, onImportComplete }: ImportCsvDialogProps) {
  const [csvText, setCsvText] = useState('')
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([])
  const [events, setEvents] = useState<{ id: string; name: string }[]>([])
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'complete'>('upload')
  const [importResults, setImportResults] = useState({ created: 0, updated: 0, skipped: 0, errors: [] as string[] })
  const { toast } = useToast()

  const loadEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('id, name')
        .order('name')
      
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error loading events:', error)
    }
  }, [])

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      setCsvText(text)
      await validateCsv(text)
    }
    reader.readAsText(file)
  }

  const handleTextChange = async (text: string) => {
    setCsvText(text)
    if (text.trim()) {
      await validateCsv(text)
    } else {
      setValidationResults([])
    }
  }

  const validateCsv = async (text: string) => {
    try {
      const { parseCsv } = await import('@/lib/csv')
      const rows = parseCsv(text)
      const results: ValidationResult[] = []

      rows.forEach((row, index) => {
        try {
          const validatedData = csvGuestSchema.parse(row)
          results.push({
            row: index + 2, // +2 because CSV has header and is 1-indexed
            data: validatedData,
            valid: true,
            errors: []
          })
        } catch (err: any) {
          // Handle Zod validation errors
          let errorMessages: string[] = []
          if (err.errors && Array.isArray(err.errors)) {
            errorMessages = err.errors.map((error: any) => {
              const field = error.path?.join('.') || 'unknown field'
              return `${field}: ${error.message}`
            })
          } else if (err.message) {
            errorMessages = [err.message]
          } else {
            errorMessages = ['Validation failed']
          }
          
          results.push({
            row: index + 2,
            data: row,
            valid: false,
            errors: errorMessages
          })
        }
      })

      setValidationResults(results)
      setStep('preview')
    } catch (err) {
      toast({
        title: "Invalid CSV",
        description: "Could not parse the CSV file. Please check the format.",
        variant: "destructive",
      })
    }
  }

  const handleImport = async () => {
    setLoading(true)
    setStep('importing')

    try {
      const { importGuestsFromCsv } = await import('@/lib/guests-client')
      const results = await importGuestsFromCsv(csvText, selectedEventIds.length > 0 ? selectedEventIds : undefined)

      // Cache invalidation is handled server-side during import

      setImportResults(results)
      setStep('complete')
      
      toast({
        title: "Import Complete",
        description: `Created ${results.created} guests, updated ${results.updated} guests, skipped ${results.skipped} duplicates. ${results.errors.length} errors.`,
      })

      onImportComplete()
    } catch (error) {
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "An error occurred during import",
        variant: "destructive",
      })
      setStep('preview')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setCsvText('')
    setValidationResults([])
    setSelectedEventIds([])
    setStep('upload')
    setImportResults({ created: 0, updated: 0, skipped: 0, errors: [] })
    onOpenChange(false)
  }

  const validCount = validationResults.filter(r => r.valid).length
  const invalidCount = validationResults.filter(r => !r.valid).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Guests from CSV</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import guests. Expected columns: {expectedCsvColumns.join(', ')}
          </DialogDescription>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">Upload CSV File</Label>
              <Input
                id="csv-file"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-2"
              />
            </div>
            
            <div className="border-t pt-4">
              <Label htmlFor="csv-text">Or paste CSV content</Label>
              <textarea
                id="csv-text"
                value={csvText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Paste CSV content here..."
                className="w-full h-32 p-3 border border-gray-300 rounded-md mt-2 font-mono text-sm"
              />
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Expected CSV Format:</h4>
              <p className="text-sm text-gray-600 mb-2">
                First row should contain headers: {expectedCsvColumns.join(', ')}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Required columns:</strong> First Name
              </p>
              <p className="text-sm text-gray-600 mb-2">
                <strong>Optional columns:</strong> Last Name, Email, Phone Number, Gender (male/female), Total Guests (1-20, defaults to 1), Household Name
              </p>
              <p className="text-sm text-gray-600">
                Example: John,Doe,john@example.com,+1234567890,male,4,Smith Family
              </p>
            </div>
          </div>
        )}

        {step === 'preview' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Badge className="bg-green-100 text-green-800 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1 text-green-800" />
                  {validCount} valid
                </Badge>
                {invalidCount > 0 && (
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    <XCircle className="h-3 w-3 mr-1 text-red-800" />
                    {invalidCount} invalid
                  </Badge>
                )}
              </div>
              
              <div className="space-y-2">
                <Label>Auto-create invitations for (optional):</Label>
                <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto border rounded-md p-3">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`import-event-${event.id}`}
                        checked={selectedEventIds.includes(event.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedEventIds([...selectedEventIds, event.id])
                          } else {
                            setSelectedEventIds(selectedEventIds.filter(id => id !== event.id))
                          }
                        }}
                      />
                      <Label 
                        htmlFor={`import-event-${event.id}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {event.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                    <TableRow>
                      <TableHead>Row</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Gender</TableHead>
                      <TableHead>Total Guests</TableHead>
                      <TableHead>Household Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Errors</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                  {validationResults.slice(0, 10).map((result) => (
                    <TableRow key={result.row}>
                      <TableCell>{result.row}</TableCell>
                      <TableCell>
                        {result.data.first_name} {result.data.last_name || ''}
                      </TableCell>
                      <TableCell>{result.data.email || '-'}</TableCell>
                      <TableCell>{result.data.phone || '-'}</TableCell>
                      <TableCell>{result.data.gender || '-'}</TableCell>
                      <TableCell>{result.data.total_guests || 1}</TableCell>
                      <TableCell>{result.data.household_name || '-'}</TableCell>
                      <TableCell>
                        {result.valid ? (
                          <Badge className="bg-green-100">Valid</Badge>
                        ) : (
                          <Badge className="bg-red-100">Invalid</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.errors.length > 0 && (
                          <div className="text-xs text-red-600">
                            {result.errors.join(', ')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {validationResults.length > 10 && (
              <p className="text-sm text-gray-500 text-center">
                Showing first 10 rows of {validationResults.length} total
              </p>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold-600 mx-auto mb-4"></div>
            <p>Importing guests...</p>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Import Complete!</h3>
            </div>
            
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{importResults.created}</div>
                <div className="text-sm text-green-700">Created</div>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{importResults.updated}</div>
                <div className="text-sm text-blue-700">Updated</div>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{importResults.skipped}</div>
                <div className="text-sm text-yellow-700">Skipped</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{importResults.errors.length}</div>
                <div className="text-sm text-red-700">Errors</div>
              </div>
            </div>

            {importResults.errors.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-red-800 mb-2">Errors:</h4>
                <div className="text-sm text-red-700 space-y-1">
                  {importResults.errors.slice(0, 5).map((error, index) => (
                    <div key={index}>{error}</div>
                  ))}
                  {importResults.errors.length > 5 && (
                    <div>... and {importResults.errors.length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'upload' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button 
                onClick={() => {
                  loadEvents()
                  if (csvText.trim()) {
                    validateCsv(csvText)
                  }
                }}
                disabled={!csvText.trim()}
              >
                <FileText className="h-4 w-4 mr-2" />
                Preview
              </Button>
            </>
          )}
          
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button 
                onClick={handleImport}
                disabled={validCount === 0}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import {validCount} Guests
              </Button>
            </>
          )}
          
          {step === 'complete' && (
            <Button onClick={handleClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImportCsvDialog
