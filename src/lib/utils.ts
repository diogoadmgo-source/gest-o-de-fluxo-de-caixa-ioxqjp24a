/* General utility functions (exposes cn) */
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
    h.trim().replace(/^"|"$/g, ''),
  )
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const currentline = parseLine(lines[i], delimiter)
    // Skip empty lines or lines with significantly wrong column count
    if (currentline.length < 1) continue

    const obj: any = {}
    let hasData = false

    // Map data to headers
    for (let j = 0; j < headers.length; j++) {
      const val = currentline[j] || ''
      obj[headers[j]] = val
      if (val) hasData = true
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
