import type { Column, RowRef } from '../types/workbench'
import { evaluate, isCellError } from './expression'
import { resolveValue, scopeForPath } from './grain'
import { safeStringify } from './text'

/**
 * Resolves one cell. A path column reads from the grain level it sits under, so
 * `orders.lines.sku` becomes `sku` against the line the row was expanded from.
 */
export function cellValue(col: Column, ref: RowRef): unknown {
  const item = ref.scopes[ref.scopes.length - 1]
  if (col.kind === 'js') return evaluate(col.code, ref.row, ref.i, item)
  const scope = scopeForPath(col.path ?? '', ref.abs)
  return resolveValue(ref.scopes[scope.level], scope.rest, col)
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
