export interface CsvRow {
  [key: string]: string
}

/**
 * Parse a CSV line handling quoted fields properly
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Escaped quote
        current += '"'
        i++ // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  // Add the last field
  values.push(current.trim())
  
  return values
}

export function parseCsv(csvText: string): CsvRow[] {
  // Normalize line endings and split
  const normalized = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const lines = normalized.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  if (lines.length === 0) return []

  // Parse headers
  const headers = parseCsvLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))
  const rows: CsvRow[] = []

  // Parse data rows
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]).map(v => v.trim().replace(/^"|"$/g, ''))
    
    // Skip rows that don't have enough columns (but allow extra columns)
    if (values.length < headers.length) continue

    const row: CsvRow = {}
    headers.forEach((header, index) => {
      // Use empty string if value is missing
      row[header] = (values[index] || '').trim()
    })
    rows.push(row)
  }

  return rows
}

export function serializeCsv(data: CsvRow[]): string {
  if (data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvLines = [headers.join(',')]

  data.forEach(row => {
    const values = headers.map(header => {
      const value = row[header] || ''
      // Escape quotes and wrap in quotes if contains comma or quote
      if (value.includes(',') || value.includes('"')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvLines.push(values.join(','))
  })

  return csvLines.join('\n')
}

export function downloadCsv(data: CsvRow[], filename: string) {
  const csv = serializeCsv(data)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

export const expectedCsvColumns = [
  'First Name',
  'Last Name', 
  'Email',
  'Phone Number',
  'Gender',
  'Total Guests',
  'Household Name'
] as const
