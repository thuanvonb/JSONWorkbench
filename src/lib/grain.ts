import type {
  ArrayConfig,
  ArrayMode,
  Column,
  ColumnKind,
  GrainLevel,
  Row,
  RowRef,
  TableView,
} from '../types/workbench'
import { arrayBadgeLabel, arrayBadgeTitle } from './labels'
import { getPath, lastSegment, pathSegments } from './path'
import { toSearchText } from './text'

/** Records sampled when working out where a column meets an array. */
const SAMPLE_SIZE = 40

/** What a join column separates entries with until it is told otherwise. */
export const DEFAULT_JOIN_SEP = ', '

/** The modes the column popover offers, in the order it lists them. */
export const ARRAY_MODES: { id: ArrayMode; name: string; input: 'index' | 'join' | null }[] = [
  { id: 'first', name: 'First entry only', input: null },
  { id: 'index', name: 'Entry at index', input: 'index' },
  { id: 'join', name: 'Join all with', input: 'join' },
  { id: 'count', name: 'Count', input: null },
  { id: 'expand', name: 'Expand to rows', input: null },
]

export function joinSeparator(config: ArrayConfig): string {
  return config.joinSep ?? DEFAULT_JOIN_SEP
}

export function entryIndex(config: ArrayConfig): number {
  return Number(config.arrayIndex) || 0
}

/** Absolute path of each grain level; levels are stored relative to the one above. */
export function grainPaths(grain: GrainLevel[]): string[] {
  const out: string[] = []
  let prefix = ''
  for (const level of grain) {
    prefix = prefix ? `${prefix}.${level.path}` : level.path
    out.push(prefix)
  }
  return out
}

/** Where a path reads from: the deepest grain level it sits under, and the rest of it. */
export interface PathScope {
  /** Index into a row's `scopes`; 0 is the record itself. */
  level: number
  /** What is left of the path once the grain level is stripped off its front. */
  rest: string
}

export function scopeForPath(path: string, paths: string[]): PathScope {
  let deepest = -1
  for (let k = 0; k < paths.length; k++) {
    if (path === paths[k] || path.startsWith(`${paths[k]}.`)) deepest = k
  }
  if (deepest === -1) return { level: 0, rest: path }
  const prefix = paths[deepest]
  return { level: deepest + 1, rest: path === prefix ? '' : path.slice(prefix.length + 1) }
}

/**
 * Reads a path out of one scope, resolving any array it crosses the way the
 * column asks for. Without a mode it walks the first entry, which is what a
 * plain path column did before arrays were configurable.
 */
export function resolveValue(base: unknown, rest: string, config: ArrayConfig): unknown {
  const mode = config.arrayMode ?? null
  const sep = joinSeparator(config)
  const parts = pathSegments(rest)
  let cur: unknown = base

  for (let k = 0; k < parts.length; k++) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur)) {
      // An explicit `[2]` in the path picks its own entry, whatever the mode is.
      if (/^\d+$/.test(parts[k])) {
        cur = cur[Number(parts[k])]
        continue
      }
      if (mode === 'count') return cur.length
      if (mode === 'join') {
        const remainder = parts.slice(k).join('.')
        return cur
          .map((entry) => resolveValue(entry, remainder, { arrayMode: 'join', joinSep: sep }))
          .filter((v) => v !== undefined && v !== '')
          .map(toSearchText)
          .join(sep)
      }
      // Every other mode reads one entry and carries on down the same segment.
      cur = cur[mode === 'index' ? entryIndex(config) : 0]
      k -= 1
      continue
    }
    cur = (cur as Record<string, unknown>)[parts[k]]
  }

  // The path may end *on* the array rather than crossing it.
  if (Array.isArray(cur) && mode) {
    if (mode === 'count') return cur.length
    if (mode === 'join') return cur.map(toSearchText).join(sep)
    if (mode === 'index') return cur[entryIndex(config)]
    if (mode === 'first') return cur[0]
  }
  return cur
}

/** Path of the first array met while resolving `rest`, relative to `base`. */
function firstArrayIn(base: unknown, rest: string): string | null {
  if (Array.isArray(base)) return ''
  let cur: unknown = base
  const walked: string[] = []
  for (const part of pathSegments(rest)) {
    if (cur === null || cur === undefined || typeof cur !== 'object') return null
    cur = (cur as Record<string, unknown>)[part]
    walked.push(part)
    if (Array.isArray(cur)) return walked.join('.')
  }
  return null
}

/** A record's value at one grain level, from the first record that reaches it. */
function sampleScope(rows: Row[], grain: GrainLevel[], level: number): unknown {
  for (const row of rows.slice(0, SAMPLE_SIZE)) {
    let cur: unknown = row
    let reached = true
    for (let L = 0; L < level; L++) {
      const entries = getPath(cur, grain[L].path)
      if (Array.isArray(entries) && entries.length) cur = entries[0]
      else {
        reached = false
        break
      }
    }
    if (reached) return cur
  }
  return undefined
}

/** Where a column crosses an array, if it does. */
export interface ArrayInfo {
  /** Grain level the column reads from. */
  level: number
  /** Path of the array relative to that level. */
  rel: string
  /** Path of the array from the record down, which is what the grain stores. */
  abs: string
  /** `items[]`, for the popover heading. */
  label: string
}

function arrayInfoFor(
  rows: Row[],
  grain: GrainLevel[],
  paths: string[],
  path: string,
): ArrayInfo | null {
  if (!path) return null
  const scope = scopeForPath(path, paths)
  const base = sampleScope(rows, grain, scope.level)
  if (base === null || base === undefined) return null
  const rel = firstArrayIn(base, scope.rest)
  if (rel === null) return null
  const prefix = scope.level > 0 ? paths[scope.level - 1] : ''
  const abs = rel === '' ? prefix : prefix ? `${prefix}.${rel}` : rel
  return { level: scope.level, rel, abs, label: `${lastSegment(rel === '' ? prefix : rel)}[]` }
}

/** The next array below the current grain, offered by the grain bar. */
export function nextGrainKey(rows: Row[], view: TableView): string | null {
  if (view.grain.length === 0) return null
  const base = sampleScope(rows, view.grain, view.grain.length)
  if (!base || typeof base !== 'object' || Array.isArray(base)) return null
  const record = base as Record<string, unknown>
  return Object.keys(record).find((key) => Array.isArray(record[key])) ?? null
}

/**
 * Puts an array on the grain, cutting any deeper level first: a column can only
 * expand relative to the scope it was resolved in. The path is stored relative
 * to the level above, so renaming a parent level is not a thing that can happen.
 */
export function appendGrain(grain: GrainLevel[], absPath: string, level: number): GrainLevel[] {
  const kept = grain.slice(0, level)
  const paths = grainPaths(kept)
  if (paths.includes(absPath)) return kept
  const prefix = paths.length ? paths[paths.length - 1] : ''
  const rel = prefix && absPath.startsWith(`${prefix}.`) ? absPath.slice(prefix.length + 1) : absPath
  return [...kept, { path: rel }]
}

/** The row every table had before grain existed: the record, at level 0. */
export function rootRef(row: Row, i: number): RowRef {
  return { row, i, scopes: [row], idx: [], abs: [], key: String(i) }
}

/** Expands one record into a row per combination of entries across the grain. */
function expandRecord(
  record: Row,
  i: number,
  grain: GrainLevel[],
  keepEmpty: boolean,
  paths: string[],
): RowRef[] {
  let contexts: { scopes: unknown[]; idx: number[] }[] = [{ scopes: [record], idx: [] }]

  for (const level of grain) {
    const next: typeof contexts = []
    for (const context of contexts) {
      const entries = getPath(context.scopes[context.scopes.length - 1], level.path)
      if (Array.isArray(entries) && entries.length) {
        entries.forEach((entry, k) => {
          next.push({ scopes: [...context.scopes, entry], idx: [...context.idx, k] })
        })
      } else if (keepEmpty) {
        // The record stays on screen, with everything below this level blank.
        next.push({ scopes: [...context.scopes, undefined], idx: [...context.idx, 0] })
      }
    }
    contexts = next
  }

  return contexts.map((context) => ({
    row: record,
    i,
    scopes: context.scopes,
    idx: context.idx,
    abs: paths,
    key: `${i}:${context.idx.join('.')}`,
  }))
}

/** The view's rows before any filter, search or sort runs. */
export function expandRows(rows: Row[], view: TableView): RowRef[] {
  if (view.grain.length === 0) return rows.map(rootRef)

  const paths = grainPaths(view.grain)
  const keepEmpty = view.keepEmpty !== false
  const out: RowRef[] = []
  rows.forEach((row, i) => {
    for (const ref of expandRecord(row, i, view.grain, keepEmpty, paths)) out.push(ref)
  })
  return out
}

/** `3` without a grain, `3.2.1` with one: the record, then the entry at each level. */
export function rowLabel(ref: RowRef): string {
  if (ref.idx.length === 0) return String(ref.i + 1)
  return `${ref.i + 1}.${ref.idx.map((k) => k + 1).join('.')}`
}

/** True once a row repeats a record already shown above it. */
export function isRepeatedRow(ref: RowRef): boolean {
  return ref.idx.some((k) => k > 0)
}

/**
 * True when a column's value repeats the one shown above: everything at or below
 * the column's own level has moved on, but the column reads from further up.
 */
export function isRepeatedCell(ref: RowRef, level: number): boolean {
  return ref.idx.length > 0 && ref.idx.slice(level).some((k) => k > 0)
}

export interface ArrayBadge {
  text: string
  title: string
  /** Expanded columns are the ones that changed the shape of the table. */
  accent: boolean
}

/** How one column meets the view's grain and the arrays below it. */
export interface ColumnGrain {
  level: number
  array: ArrayInfo | null
  /** The mode actually in force, once the grain is taken into account. */
  mode: ArrayMode | null
  badge: ArrayBadge | null
}

/** Enough of a column to work out its array handling; the popover draft fits too. */
export interface ColumnLike extends ArrayConfig {
  kind: ColumnKind
  path?: string
}

/**
 * A column sitting inside an expanded array is already one row per entry, so it
 * reads as `expand` whatever it stored. One that still crosses an array cannot
 * be expanded until the grain says so, so a stored `expand` reads as `first`.
 */
export function effectiveArrayMode(
  config: ArrayConfig,
  array: ArrayInfo | null,
  level: number,
): ArrayMode | null {
  if (!array) return level > 0 ? 'expand' : null
  const mode = config.arrayMode ?? 'first'
  return mode === 'expand' ? 'first' : mode
}

function describeColumn(
  rows: Row[],
  grain: GrainLevel[],
  paths: string[],
  column: ColumnLike,
): ColumnGrain {
  const path = column.kind === 'js' ? '' : (column.path ?? '')
  const level = column.kind === 'js' ? 0 : scopeForPath(path, paths).level
  const array = column.kind === 'js' ? null : arrayInfoFor(rows, grain, paths, path)
  const mode = effectiveArrayMode(column, array, level)
  if (!mode) return { level, array, mode, badge: null }

  const text = arrayBadgeLabel(mode, joinSeparator(column), entryIndex(column))
  const source = array ? array.abs : (paths[level - 1] ?? '')
  return { level, array, mode, badge: { text, title: arrayBadgeTitle(mode, source, text), accent: mode === 'expand' } }
}

/** How one column — or the popover's draft — meets the arrays around it. */
export function columnGrain(rows: Row[], view: TableView, column: ColumnLike): ColumnGrain {
  return describeColumn(rows, view.grain, grainPaths(view.grain), column)
}

/** The same, for every column of the view, keyed by column id. */
export function columnGrains(rows: Row[], view: TableView): Map<string, ColumnGrain> {
  const paths = grainPaths(view.grain)
  return new Map(
    view.columns.map((column: Column) => [column.id, describeColumn(rows, view.grain, paths, column)]),
  )
}
