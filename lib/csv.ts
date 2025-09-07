export interface CsvRow {
  [key: string]: string
}

export function parseCsv(csvText: string): CsvRow[] {
  const lines = csvText.split('\n').filter(line => line.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
  const rows: CsvRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
    if (values.length !== headers.length) continue

    const row: CsvRow = {}
    headers.forEach((header, index) => {
      row[header] = values[index] || ''
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
  'first_name',
  'last_name', 
  'email',
  'phone',
  'is_vip',
  'plus_ones_allowed',
  'dietary',
  'household_name'
] as const
