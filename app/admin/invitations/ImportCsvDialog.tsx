'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Download, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  FileText,
  Users,
  Calendar
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'
// CSV parsing will be handled on the server side
import { csvInvitationSchema } from '@/lib/validators'
import type { CsvInvitationInput } from '@/lib/validators'

interface ImportCsvDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImport: (data: CsvInvitationInput[]) => Promise<{
    success: number
    errors: Array<{ row: number; error: string }>
  }>
  loading?: boolean
}

interface ImportResult {
  success: number
  errors: Array<{ row: number; error: string }>
}

export default function ImportCsvDialog({
  open,
  onOpenChange,
  onImport,
  loading = false,
}: ImportCsvDialogProps) {
  const [csvData, setCsvData] = useState<CsvInvitationInput[]>([])
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCsv = (csvText: string) => {
    const lines = csvText.split('\n').filter(line => line.trim())
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    const rows: any[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
      if (values.length !== headers.length) continue

      const row: any = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })
      rows.push(row)
    }

    return rows
  }

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)
    setProgress(0)

    try {
      const text = await file.text()
      const parsed = parseCsv(text)
      
      setProgress(50)

      // Validate each row
      const validatedData: CsvInvitationInput[] = []
      const errors: Array<{ row: number; error: string }> = []

      for (let i = 0; i < parsed.length; i++) {
        try {
          const validated = csvInvitationSchema.parse(parsed[i])
          validatedData.push(validated)
        } catch (error) {
          errors.push({
            row: i + 1,
            error: error instanceof Error ? error.message : 'Validation failed'
          })
        }
      }

      setProgress(100)
      setCsvData(validatedData)
      
      if (errors.length > 0) {
        toast({
          title: "Validation completed with errors",
          description: `${validatedData.length} valid rows, ${errors.length} errors`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "File processed successfully",
          description: `${validatedData.length} valid rows found`,
        })
      }
    } catch (error) {
      toast({
        title: "Error processing file",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const handleImport = async () => {
    if (csvData.length === 0) {
      toast({
        title: "No data to import",
        description: "Please select a CSV file first",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await onImport(csvData)
      setImportResult(result)
      
      if (result.errors.length === 0) {
        toast({
          title: "Import successful",
          description: `${result.success} invitations imported successfully`,
        })
      } else {
        toast({
          title: "Import completed with errors",
          description: `${result.success} successful, ${result.errors.length} errors`,
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      })
    }
  }

  const handleClose = () => {
    setCsvData([])
    setImportResult(null)
    setProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onOpenChange(false)
  }

  const downloadTemplate = () => {
    const template = [
      'guest_email,guest_first_name,guest_last_name,event_id,headcount,status',
      'john@example.com,John,Doe,event-id-1,2,pending',
      'jane@example.com,Jane,Smith,event-id-2,1,accepted'
    ].join('\n')

    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'invitations-template.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Invitations from CSV
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to create invitations for guests and events
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template Download */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                CSV Template
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Download our template to see the required format and column names.
              </p>
              <Button variant="outline" onClick={downloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upload CSV File</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    disabled={isProcessing}
                  />
                </div>

                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing file...</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="w-full" />
                  </div>
                )}

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Required columns:</strong> guest_email, event_id, headcount, status<br />
                    <strong>Optional columns:</strong> guest_first_name, guest_last_name<br />
                    <strong>Status values:</strong> pending, accepted, declined, waitlist
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>

          {/* Preview Data */}
          {csvData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Preview Data ({csvData.length} rows)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <div className="grid grid-cols-6 gap-2 text-xs font-medium text-gray-500 border-b pb-2 mb-2">
                    <div>Email</div>
                    <div>Name</div>
                    <div>Event ID</div>
                    <div>Headcount</div>
                    <div>Status</div>
                    <div>Valid</div>
                  </div>
                  {csvData.slice(0, 10).map((row, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 text-xs py-1 border-b last:border-b-0">
                      <div className="truncate">{row.guest_email}</div>
                      <div className="truncate">
                        {row.guest_first_name} {row.guest_last_name}
                      </div>
                      <div className="truncate">{row.event_id}</div>
                      <div>{row.headcount}</div>
                      <div>
                        <Badge 
                          variant="outline" 
                          className={
                            row.status === 'accepted' 
                              ? 'bg-green-100 text-green-800 border-green-300'
                              : row.status === 'pending'
                              ? 'bg-gray-100 text-gray-800 border-gray-300'
                              : row.status === 'declined'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                          }
                        >
                          {row.status}
                        </Badge>
                      </div>
                      <div>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                  ))}
                  {csvData.length > 10 && (
                    <div className="text-xs text-gray-500 text-center py-2">
                      ... and {csvData.length - 10} more rows
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Import Results */}
          {importResult && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Import Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-5 w-5" />
                      <span className="font-medium">{importResult.success} successful</span>
                    </div>
                    {importResult.errors.length > 0 && (
                      <div className="flex items-center gap-2 text-red-600">
                        <XCircle className="h-5 w-5" />
                        <span className="font-medium">{importResult.errors.length} errors</span>
                      </div>
                    )}
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-red-600">Errors:</h4>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {importResult.errors.map((error, index) => (
                          <div key={index} className="text-sm text-red-600 bg-red-50 p-2 rounded">
                            Row {error.row}: {error.error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {importResult ? 'Close' : 'Cancel'}
          </Button>
          {!importResult && (
            <Button 
              onClick={handleImport} 
              disabled={loading || csvData.length === 0}
              className="bg-gold-600 hover:bg-gold-700"
            >
              {loading ? 'Importing...' : 'Import Invitations'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
