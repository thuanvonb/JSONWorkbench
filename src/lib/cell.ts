import type { Column, Row } from '../types/workbench'
import { evaluate, isCellError } from './expression'
import { getPath } from './path'

export function cellValue(col: Column, row: Row, i: number): unknown {
  if (col.kind === 'js') return evaluate(col.code, row, i)
  return getPath(row, col.path)
}

/** Presentation variant for a cell; the table stylesheet owns the actual look. */
export type CellVariant = 'error' | 'missing' | 'null' | 'number' | 'boolean' | 'object' | 'text'

export interface FormattedCell {
  text: string
  variant: CellVariant
}

const OBJECT_PREVIEW_LIMIT = 90

export function formatCell(v: unknown): FormattedCell {
  if (isCellError(v)) return { text: `⚠ ${v.__err}`, variant: 'error' }
  if (v === undefined) return { text: '—', variant: 'missing' }
  if (v === null) return { text: 'null', variant: 'null' }
  if (typeof v === 'number') return { text: String(v), variant: 'number' }
  if (typeof v === 'boolean') return { text: String(v), variant: 'boolean' }
  if (typeof v === 'object') {
    let text = safeStringify(v)
    if (text.length > OBJECT_PREVIEW_LIMIT) text = `${text.slice(0, OBJECT_PREVIEW_LIMIT)}…`
    return { text, variant: 'object' }
  }
  return { text: String(v), variant: 'text' }
}

/** Flattens a value to the plain string used for search, filters and CSV. */
export function toSearchText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return safeStringify(v)
  return String(v)
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v)
  } catch {
    return '[object]'
  }
}
