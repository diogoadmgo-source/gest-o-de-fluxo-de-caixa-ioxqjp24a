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
