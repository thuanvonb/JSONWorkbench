import type { Row } from '../types/workbench'

/** Marker object returned in place of a value when user code fails. */
export interface CellError {
  __err: string
}

export function isCellError(v: unknown): v is CellError {
  return !!v && typeof v === 'object' && typeof (v as CellError).__err === 'string'
}

/**
 * `row` is always the whole record; `item` is the array entry the row was
 * expanded from, and the record itself when the table has no grain.
 */
export type RowExpression = (row: Row, i: number, item: unknown) => unknown

/**
 * Compiled user expressions, keyed by source. Expressions run against data the
 * user pasted into their own browser tab; nothing is sent anywhere.
 */
const cache = new Map<string, RowExpression>()

export function compileExpression(code: string | undefined): RowExpression | null {
  if (!code) return null
  const cached = cache.get(code)
  if (cached) return cached

  let fn: RowExpression
  try {
    // eslint-disable-next-line no-new-func
    fn = new Function('row', 'i', 'item', `return (${code});`) as RowExpression
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    fn = () => ({ __err: message })
  }
  cache.set(code, fn)
  return fn
}

/** Runs an expression, folding both compile and runtime failures into a CellError. */
export function evaluate(code: string | undefined, row: Row, i: number, item: unknown = row): unknown {
  const fn = compileExpression(code)
  if (!fn) return undefined
  try {
    const result = fn(row, i, item)
    // An expression like `row => row.total` evaluates to a function; apply it
    // so both `row.total` and the arrow form behave the same.
    return typeof result === 'function' ? (result as RowExpression)(row, i, item) : result
  } catch (err) {
    return { __err: err instanceof Error ? err.message : String(err) }
  }
}
