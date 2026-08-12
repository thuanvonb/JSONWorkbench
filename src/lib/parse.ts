import type { Row } from '../types/workbench'

export type ParseResult = { ok: true; rows: Row[] } | { ok: false; error: string }

/**
 * Accepts a JSON array, a single JSON object, an object wrapping a record array
 * (`{ data: [...] }`), or a stream of JSON values — JSONL/NDJSON with one record
 * per line, as well as pretty-printed records written back to back.
 */
export function parseRecords(text: string): ParseResult {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Nothing to parse.' }

  // A whole-document parse wins when it works: it is the only shape that can
  // carry a wrapper object around the record array.
  try {
    return { ok: true, rows: toRows(JSON.parse(trimmed)) }
  } catch {
    return parseStream(trimmed)
  }
}

/** An open bracket count, carried from line to line while a record is unfinished. */
interface Depth {
  open: number
}

/**
 * Reads back-to-back JSON values. Lines are appended until the brackets balance,
 * so both one-record-per-line JSONL and a stream of pretty-printed records work.
 * A value that never parses is reported against the line it started on.
 */
function parseStream(text: string): ParseResult {
  const lines = text.split('\n')
  const depth: Depth = { open: 0 }
  const rows: Row[] = []
  let buffer = ''
  let startLine = 0

  for (let n = 0; n < lines.length; n++) {
    const line = lines[n]
    // Blank lines between records are separators, not values.
    if (!buffer && !line.trim()) continue
    if (!buffer) startLine = n + 1
    buffer = buffer ? `${buffer}\n${line}` : line

    scanDepth(line, depth)
    if (depth.open > 0) continue

    try {
      rows.push(JSON.parse(buffer))
    } catch (err) {
      return { ok: false, error: lineError(startLine, errorMessage(err)) }
    }
    buffer = ''
    depth.open = 0
  }

  if (buffer) return { ok: false, error: lineError(startLine, 'Unexpected end of input.') }
  if (rows.length === 0) return { ok: false, error: 'Nothing to parse.' }
  return { ok: true, rows }
}

/**
 * Adds one line's unclosed brackets to the running count, ignoring anything
 * quoted. A JSON string can never span a line break, so the quoted state is
 * dropped at the end of the line and a stray `"` cannot swallow the rest of
 * the file.
 */
function scanDepth(line: string, depth: Depth): void {
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '\\') i++
      else if (ch === '"') quoted = false
      continue
    }
    if (ch === '"') quoted = true
    else if (ch === '{' || ch === '[') depth.open++
    else if (ch === '}' || ch === ']') depth.open--
  }
}

function lineError(line: number, message: string): string {
  return `Line ${line}: ${message}`
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function toRows(data: unknown): Row[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const arrayKey = Object.keys(record).find((k) => {
      const v = record[k]
      return Array.isArray(v) && v.length > 0 && typeof v[0] === 'object'
    })
    return arrayKey ? (record[arrayKey] as Row[]) : [record]
  }
  return [{ value: data }]
}

/** True when two records share the same top-level keys, so existing tables still apply. */
export function sameShape(a: Row, b: Row): boolean {
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const ka = Object.keys(a as object).sort().join(',')
  const kb = Object.keys(b as object).sort().join(',')
  return ka === kb
}
