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
 * Simple CSV Parser
 * @param content string content of the CSV file
 * @param delimiter string delimiter, default ';'
 * @returns Array of objects
 */
export function parseCSV(content: string, delimiter: string = ';'): any[] {
  const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '')
  if (lines.length < 2) return []

  // Guess delimiter if not provided or default seems wrong
  if (lines[0].indexOf(delimiter) === -1) {
    if (lines[0].indexOf(',') > -1) delimiter = ','
    else if (lines[0].indexOf('\t') > -1) delimiter = '\t'
  }

  const headers = lines[0].split(delimiter).map((h) => h.trim())
  const result = []

  for (let i = 1; i < lines.length; i++) {
    const obj: any = {}
    const currentline = lines[i].split(delimiter)

    // Handle case where line might have different columns count (basic handling)
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = currentline[j]?.trim() || ''
    }
    result.push(obj)
  }

  return result
}
