import type { Row } from '../types/workbench'
import { lastSegment, pathSegments } from './path'

/**
 * The records one table reads. Without an offset that is the whole payload;
 * with one the path is walked into the records and every array crossed on the
 * way is flattened, so offsetting to `orders.lines` against a payload of orders
 * gives one record per line.
 */
export interface OffsetResult {
  records: Row[]
  /** The path ended on an array, which is what makes the last crumb read `lines[]`. */
  spansArray: boolean
}

export function resolveOffset(rows: Row[], offset: string): OffsetResult {
  if (!offset) return { records: rows, spansArray: false }

  const parts = pathSegments(offset)
  const records: Row[] = []
  let spansArray = false

  const walk = (value: unknown, depth: number): void => {
    if (value === null || value === undefined) return
    if (Array.isArray(value)) {
      // Arrays are flattened rather than indexed, at the end of the path as well
      // as on the way: that is what turns a nested list into the table's records.
      if (depth >= parts.length) spansArray = true
      for (const entry of value) walk(entry, depth)
      return
    }
    if (depth >= parts.length) {
      records.push(value)
      return
    }
    // A scalar part-way down the path holds nothing to read.
    if (typeof value !== 'object') return
    walk((value as Record<string, unknown>)[parts[depth]], depth + 1)
  }

  for (const row of rows) walk(row, 0)
  return { records, spansArray }
}

/** One step of the offset bar: where it reads from, and what clicking it goes back to. */
export interface OffsetCrumb {
  /** Absolute path this crumb offsets to; `''` is the whole source. */
  path: string
  label: string
  /** The level the table is reading from right now, so there is nowhere to go. */
  current: boolean
}

export function offsetCrumbs(offset: string, spansArray: boolean): OffsetCrumb[] {
  const parts = pathSegments(offset)
  const crumbs: OffsetCrumb[] = [{ path: '', label: 'source', current: parts.length === 0 }]

  parts.forEach((part, level) => {
    const last = level === parts.length - 1
    crumbs.push({
      path: parts.slice(0, level + 1).join('.'),
      label: last && spansArray ? `${part}[]` : part,
      current: last,
    })
  })
  return crumbs
}

/** One level back up the offset, for the schema tab's `up` button. */
export function parentOffset(offset: string): string {
  return pathSegments(offset).slice(0, -1).join('.')
}

/**
 * Absolute offset for a key of the schema tree. The tree describes the records
 * the table already reads, so its paths are relative to the current offset.
 */
export function childOffset(offset: string, path: string): string {
  return offset ? `${offset}.${path}` : path
}

/** Name of the table "Open in a new table" mints. */
export function offsetTableName(offset: string): string {
  return offset ? lastSegment(offset) : 'root'
}
