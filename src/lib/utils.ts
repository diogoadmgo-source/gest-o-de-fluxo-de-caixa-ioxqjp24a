import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeText(text: any): string {
  if (text === null || text === undefined) return ''
  return String(text).trim()
}

export function parsePtBrFloat(value: any, label?: string): number {
  if (value === null || value === undefined || value === '') return 0
  if (typeof value === 'number') return value

  let str = String(value).trim()
  // Remove generic currency symbols (R$) and spaces
  str = str.replace(/[R$\s]/g, '')

  if (!str) return 0

  // PT-BR format usually uses comma as decimal separator: 1.234,56
  // Logic: Remove all dots (thousands separators), then replace comma with dot.
  // This handles:
  // 1.234,56 -> 1234.56
  // 1.000 -> 1000
  // 10,50 -> 10.50

  // Note: This logic assumes PT-BR format.
  // If the input is 10.50 (US format), it becomes 1050 (Wrong), but consistent with "parsePtBrFloat".

  if (str.indexOf(',') > -1) {
    str = str.replace(/\./g, '').replace(',', '.')
  } else if (str.indexOf('.') > -1) {
    // If there is a dot but no comma, it might be 1.000 (1000) or 1.5 (US 1.5).
    // Given the function name, we treat dot as thousands separator (remove it).
    str = str.replace(/\./g, '')
  }

  const num = parseFloat(str)

  if (isNaN(num)) {
    if (label) {
      throw new Error(`Valor inválido em '${label}': ${value}`)
    }
    return 0
  }

  return num
}

export function isGarbageCompany(name: any): boolean {
  if (!name) return true
  const n = String(name).trim().toLowerCase()
  // List of terms that usually indicate a summary row or invalid company name in imports
  const garbage = [
    'total',
    'saldo',
    'anterior',
    'a transportar',
    'transporte',
    'saldo anterior',
  ]
  return garbage.includes(n)
}

export function normalizeCompanyId(id: any): string | null {
  if (!id) return null
  const s = String(id).trim()
  if (s === 'undefined' || s === 'null' || s === '' || s === 'all') return null
  return s
}

export function parseCSV(content: string) {
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length === 0) return []

  // Detect separator
  const firstLine = lines[0]
  const separator = firstLine.includes(';') ? ';' : ','

  const splitLine = (line: string) => {
    const row: string[] = []
    let current = ''
    let inQuotes = false

    for (let j = 0; j < line.length; j++) {
      const char = line[j]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === separator && !inQuotes) {
        row.push(current)
        current = ''
      } else {
        current += char
      }
    }
    row.push(current)
    return row
  }

  const headers = splitLine(firstLine).map((h) =>
    h.trim().replace(/^"|"$/g, '').replace(/""/g, '"'),
  )

  const result = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) continue

    const row = splitLine(line)

    // Create object
    const obj: any = {}
    headers.forEach((header, index) => {
      let val = row[index]?.trim() || ''
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1).replace(/""/g, '"')
      }
      obj[header] = val
    })

    result.push(obj)
  }

  return result
}
