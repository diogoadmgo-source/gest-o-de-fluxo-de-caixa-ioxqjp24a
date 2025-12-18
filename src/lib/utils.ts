import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merges multiple class names into a single string
 * @param inputs - Array of class names
 * @returns Merged class names
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Robust CSV Parser that handles quoted fields
 * @param content string content of the CSV file
 * @param delimiter string delimiter, default auto-detect or ';'
 * @returns Array of objects
 */
export function parseCSV(content: string, delimiter?: string): any[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) return []

  // Guess delimiter if not provided
  if (!delimiter) {
    const firstLine = lines[0]
    if (firstLine.indexOf(';') > -1) delimiter = ';'
    else if (firstLine.indexOf(',') > -1) delimiter = ','
    else if (firstLine.indexOf('\t') > -1) delimiter = '\t'
    else delimiter = ';'
  }

  const parseLine = (text: string, delim: string) => {
    const pattern = new RegExp(
      '(\\' +
        delim +
        '|\\r?\\n|\\r|^)' +
        '(?:"([^"]*(?:""[^"]*)*)"|' +
        '([^"\\' +
        delim +
        '\\r\\n]*))',
      'gi',
    )
    const matches = []
    let match
    while ((match = pattern.exec(text))) {
      if (match.index === pattern.lastIndex) pattern.lastIndex++
      const matchValue = match[2]
        ? match[2].replace(new RegExp('""', 'g'), '"')
        : match[3]
      if (matchValue !== undefined) matches.push(matchValue.trim())
    }
    return matches
  }

  const headers = parseLine(lines[0], delimiter).map((h) =>
    h.trim().replace(/^"|"$/g, '').trim(),
  )

  const result = []

  for (let i = 1; i < lines.length; i++) {
    const currentline = parseLine(lines[i], delimiter)

    // Skip empty lines or lines with significantly wrong column count
    // Allow for some flexibility (e.g. trailing empty columns)
    if (currentline.length < 1) continue

    const obj: any = {}
    let hasData = false

    // Map data to headers
    for (let j = 0; j < headers.length; j++) {
      const val = currentline[j] || ''
      if (headers[j]) {
        obj[headers[j]] = val
        if (val) hasData = true
      }
    }

    if (hasData) result.push(obj)
  }

  return result
}

/**
 * Normalizes a company ID value.
 * Treats null, undefined, empty strings, "null", and "undefined" as null.
 * @param id - The company ID to normalize
 * @returns The normalized company ID (string or null)
 */
export function normalizeCompanyId(
  id: string | null | undefined,
): string | null {
  if (id === null || id === undefined) return null
  if (typeof id === 'string') {
    const trimmed = id.trim()
    if (trimmed === '' || trimmed === 'null' || trimmed === 'undefined') {
      return null
    }
    return trimmed
  }
  return null
}

/**
 * Checks if a company name matches garbage patterns.
 * Patterns: "filtros aplicados:%", "total", "valor%", "intercompany%"
 * @param name - The company name to check
 * @returns true if it is a garbage company
 */
export function isGarbageCompany(name: string): boolean {
  if (!name) return false
  const lower = name.toLowerCase().trim()
  if (
    lower.startsWith('filtros aplicados:') ||
    lower === 'total' ||
    lower.startsWith('valor') ||
    lower.startsWith('intercompany')
  ) {
    return true
  }
  return false
}

/**
 * Advanced PT-BR Currency Parser
 * parses strings like "R$ 1.234,56", "(1.234,56)", "3.318.000,00" into valid numbers.
 * Throws error if format is invalid.
 */
export function parsePtBrFloat(
  value: any,
  fieldName: string = 'Valor',
): number {
  if (typeof value === 'number') {
    if (!isFinite(value))
      throw new Error(
        `O campo '${fieldName}' contém um número infinito ou inválido.`,
      )
    return value
  }
  if (value === null || value === undefined || value === '') return 0

  let str = String(value).trim()

  // Handle accounting format (123.45) -> negative
  const isNegativeParentheses = /^\(.*\)$/.test(str)
  if (isNegativeParentheses) {
    str = str.replace(/[()]/g, '')
  }

  // Remove currency symbol and spaces
  // Regex: Remove R$, R $, r$, and surrounding spaces
  str = str.replace(/^[Rr]\$\s?/, '').replace(/\s/g, '')

  // Handle negative sign
  let isNegative = isNegativeParentheses
  if (str.startsWith('-')) {
    isNegative = !isNegative
    str = str.substring(1)
  } else if (str.endsWith('-')) {
    // Sometimes systems export 100-
    isNegative = !isNegative
    str = str.substring(0, str.length - 1)
  }

  if (str === '') return 0

  // Check for forbidden characters (allow digits, dot, comma)
  if (/[^0-9.,]/.test(str)) {
    throw new Error(
      `O campo '${fieldName}' contém caracteres inválidos: "${value}".`,
    )
  }

  // Count separators
  const commaCount = (str.match(/,/g) || []).length
  const dotCount = (str.match(/\./g) || []).length

  if (commaCount > 1) {
    throw new Error(
      `O campo '${fieldName}' possui múltiplas vírgulas: "${value}".`,
    )
  }

  let normalized = str

  // Logic per AC / PT-BR standards
  if (commaCount === 1 && dotCount > 0) {
    // Both present: Dot is thousand, Comma is decimal
    // e.g. 1.234,56
    // Remove dots, replace comma with dot
    normalized = str.replace(/\./g, '').replace(',', '.')
  } else if (commaCount === 1) {
    // Only comma -> decimal
    // e.g. 1234,56
    normalized = str.replace(',', '.')
  } else if (dotCount > 0) {
    // Only dots -> multiple dots mean thousands
    // e.g. 1.234 or 1.234.567
    normalized = str.replace(/\./g, '')
  } else {
    // No separators -> integer
    // e.g. 1234
  }

  const num = parseFloat(normalized)

  if (isNaN(num) || !isFinite(num)) {
    throw new Error(
      `O campo '${fieldName}' não contém um valor numérico válido: "${value}".`,
    )
  }

  return isNegative ? -num : num
}
