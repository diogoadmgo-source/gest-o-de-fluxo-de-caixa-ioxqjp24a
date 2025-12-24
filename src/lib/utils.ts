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
  // Remove currency symbols (R$, $, etc) and spaces, keep digits, dots, commas, minus
  // We use a broader regex to remove anything that is NOT a digit, dot, comma or minus
  // This handles "R$ 1.200,00" -> "1.200,00"
  str = str.replace(/[^\d.,-]/g, '')

  if (!str) return 0

  // Handle negative sign
  const isNegative = str.startsWith('-')
  if (isNegative) str = str.substring(1)

  // Logic to detect format: PT-BR (1.234,56) vs US (1,234.56)
  if (str.includes(',') && str.includes('.')) {
    // Both separators present
    if (str.lastIndexOf(',') > str.lastIndexOf('.')) {
      // 1.234,56 -> PT-BR (Comma is decimal)
      str = str.replace(/\./g, '').replace(',', '.')
    } else {
      // 1,234.56 -> US (Dot is decimal)
      str = str.replace(/,/g, '')
    }
  } else if (str.includes(',')) {
    // Only comma: 1234,56 -> PT-BR (Decimal separator)
    str = str.replace(',', '.')
  } else if (str.includes('.')) {
    // Only dot: 1.234 or 1234.56
    // Heuristic:
    // - If it matches exactly 2 decimal places (e.g. 123.45), assume US Decimal.
    // - If it matches 1 decimal place (e.g. 123.4), it's ambiguous, but usually US Decimal in CSVs.
    // - If it matches 3 decimal places (e.g. 1.234), assume PT-BR Thousands (1234).
    // - If multiple dots (1.234.567), assume PT-BR Thousands.

    const parts = str.split('.')
    const lastPart = parts[parts.length - 1]

    // If multiple dots, definitely thousands separator (PT-BR)
    if (parts.length > 2) {
      str = str.replace(/\./g, '')
    }
    // Single dot
    else {
      // If 2 digits (cents), treat as US Decimal
      if (lastPart.length === 2) {
        // Keep dot
      }
      // If 1 digit, likely US Decimal too (e.g. 10.5)
      else if (lastPart.length === 1) {
        // Keep dot
      }
      // Otherwise (3+ digits or 0 digits), treat as thousands separator (PT-BR)
      // e.g. 1.000 -> 1000
      else {
        str = str.replace(/\./g, '')
      }
    }
  }

  const num = parseFloat(str)
  const result = isNegative ? -num : num

  if (isNaN(result)) {
    if (label) {
      // Log for debugging but don't crash unless critical
      console.warn(`Parse error for ${label}: ${value}`)
    }
    return 0
  }

  return result
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
    'filtros aplicados',
    'geral',
    'subtotal',
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

  // Detect separator from first valid line
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
