import type { Row } from '../types/workbench'

/** Value type label shown in the UI. `'—'` means the key was absent. */
export type ValueType = 'null' | 'array' | 'object' | 'string' | 'number' | 'boolean' | 'function' | 'symbol' | 'bigint' | 'undefined' | '—'

export interface PathInfo {
  path: string
  type: ValueType
}

/** Records scanned when listing available paths. */
const SAMPLE_SIZE = 40

/** Splits `a.b[0].c` into its segments, with bracket indexes as their own step. */
export function pathSegments(path: string | undefined): string[] {
  return String(path ?? '')
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter((p) => p !== '')
}

/** Reads `a.b[0].c` out of a record, tolerating missing links. */
export function getPath(obj: Row, path: string | undefined): unknown {
  if (!path) return undefined
  let cur: unknown = obj
  for (const part of pathSegments(path)) {
    if (cur === null || cur === undefined) return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  return cur
}

export function typeOf(v: unknown): ValueType {
  if (v === null) return 'null'
  if (Array.isArray(v)) return 'array'
  if (v === undefined) return '—'
  return typeof v
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/** Every path present in the sampled records, branches included, for autocomplete. */
export function collectPaths(rows: Row[]): PathInfo[] {
  const seen: PathInfo[] = []

  const walk = (obj: Record<string, unknown>, prefix: string, depth: number): void => {
    if (depth > 4) return
    for (const key of Object.keys(obj)) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key
      if (!seen.some((s) => s.path === path)) seen.push({ path, type: typeOf(value) })
      if (isPlainRecord(value)) walk(value, path, depth + 1)
    }
  }

  for (const row of rows.slice(0, SAMPLE_SIZE)) {
    if (isPlainRecord(row)) walk(row, '', 1)
  }

  return seen
}

/** Deepest object nesting walked when inferring columns. */
const LEAF_DEPTH = 3

/**
 * Leaf paths of the sampled records: nested objects are walked into rather than
 * listed, so the result is a set of paths that hold values worth a column.
 */
export function leafPaths(rows: Row[]): string[] {
  const seen: string[] = []

  const walk = (obj: Record<string, unknown>, prefix: string, depth: number): void => {
    if (depth > LEAF_DEPTH) return
    for (const key of Object.keys(obj)) {
      const value = obj[key]
      const path = prefix ? `${prefix}.${key}` : key
      if (isPlainRecord(value) && depth < LEAF_DEPTH) walk(value, path, depth + 1)
      else if (!seen.includes(path)) seen.push(path)
    }
  }

  for (const row of rows.slice(0, SAMPLE_SIZE)) {
    if (isPlainRecord(row)) walk(row, '', 1)
  }

  return seen
}

export function lastSegment(path: string): string {
  return path.split('.').slice(-1)[0] ?? path
}
