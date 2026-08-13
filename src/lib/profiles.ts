import type {
  BoolOp,
  ColumnKind,
  Filter,
  FilterOp,
  Row,
  SortDir,
  TableView,
  Workspace,
} from '../types/workbench'
import { createView } from './factories'
import { rowRef } from './filters'
import { createId } from './id'

/**
 * A saved table setup — columns, filters and sort, with no data attached, so it
 * can be dropped onto any payload of the same shape.
 */
export interface Profile {
  id: string
  name: string
  /** ISO timestamp, shown as a date in the list. */
  savedAt: string
  /** Sorted top-level keys of the data it was saved from; '' when unknown. */
  shape: string
  views: ProfileView[]
}

export interface ProfileView {
  name: string
  columns: ProfileColumn[]
  filters: ProfileFilter[]
  /** Sort is stored by column name, since ids are minted fresh on load. */
  sortColName: string | null
  sortDir: SortDir | null
}

export interface ProfileColumn {
  name: string
  kind: ColumnKind
  path?: string
  code?: string
}

/** Like a live filter row, except simple rows point at a column by name. */
export type ProfileFilter =
  | { type: 'simple'; enabled: boolean; colName: string | null; op: FilterOp; value: string }
  | { type: 'custom'; enabled: boolean; code: string }
  | { type: 'compound'; enabled: boolean; left: number | null; cop: BoolOp; right: number | null }

/** Top-level keys of the first record, the test for whether a profile fits. */
export function shapeKey(rows: Row[]): string {
  const first = rows[0]
  if (!first || typeof first !== 'object' || Array.isArray(first)) return ''
  return Object.keys(first as object)
    .sort()
    .join(',')
}

/** Profile names are matched loosely, so saving over one is hard to miss. */
export function sameName(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase()
}

/** True when the profile was saved from data with these same top-level keys. */
export function fitsShape(profile: Profile, shape: string): boolean {
  return shape !== '' && profile.shape === shape
}

/** Captures every table of a workspace as a reusable profile. */
export function createProfile(name: string, workspace: Workspace): Profile {
  return {
    id: createId(),
    name,
    savedAt: new Date().toISOString(),
    shape: shapeKey(workspace.rows),
    views: workspace.views.map(snapshotView),
  }
}

function snapshotView(view: TableView): ProfileView {
  const nameOf = (colId: string): string | null => view.columns.find((c) => c.id === colId)?.name ?? null
  return {
    name: view.name,
    columns: view.columns.map((c) => ({ name: c.name, kind: c.kind, path: c.path, code: c.code })),
    filters: view.filters.map((f) => snapshotFilter(f, nameOf)),
    sortColName: view.sort ? nameOf(view.sort.colId) : null,
    sortDir: view.sort ? view.sort.dir : null,
  }
}

function snapshotFilter(filter: Filter, nameOf: (colId: string) => string | null): ProfileFilter {
  if (filter.type === 'custom') return { type: 'custom', enabled: filter.enabled, code: filter.code }
  if (filter.type === 'compound') {
    return {
      type: 'compound',
      enabled: filter.enabled,
      left: filter.left,
      cop: filter.cop,
      right: filter.right,
    }
  }
  return {
    type: 'simple',
    enabled: filter.enabled,
    colName: nameOf(filter.colId),
    op: filter.op,
    value: filter.value,
  }
}

/**
 * Rebuilds live tables from a profile. Columns get fresh ids, and the filters
 * and sort are re-pointed at them by column name.
 */
export function profileViews(profile: Profile): TableView[] {
  if (profile.views.length === 0) return [createView('Table 1')]

  return profile.views.map((saved) => {
    const columns = saved.columns.map((c) => ({ ...c, id: createId() }))
    const idOf = (name: string | null): string | undefined =>
      name === null ? undefined : columns.find((c) => c.name === name)?.id

    return {
      id: createId(),
      name: saved.name || 'Table 1',
      columns,
      filters: (saved.filters ?? [])
        .map(normalizeProfileFilter)
        .filter((f): f is ProfileFilter => f !== null)
        .map((f) => liveFilter(f, idOf)),
      sort: sortOf(saved, idOf(saved.sortColName)),
    }
  })
}

function liveFilter(
  saved: ProfileFilter,
  idOf: (name: string | null) => string | undefined,
): Filter {
  if (saved.type === 'custom') {
    return { id: createId(), type: 'custom', enabled: saved.enabled, code: saved.code }
  }
  if (saved.type === 'compound') {
    return {
      id: createId(),
      type: 'compound',
      enabled: saved.enabled,
      left: saved.left,
      cop: saved.cop,
      right: saved.right,
    }
  }
  return {
    id: createId(),
    type: 'simple',
    enabled: saved.enabled,
    // A column that no longer exists leaves the filter inert rather than
    // silently hiding rows.
    colId: idOf(saved.colName) ?? '',
    op: saved.op,
    value: saved.value,
  }
}

/** Profiles saved before the filter panel tagged rows `kind: 'col' | 'js'`. */
interface SavedProfileFilter {
  type?: string
  kind?: string
  enabled?: boolean
  colName?: string | null
  op?: FilterOp
  value?: string
  code?: string
  left?: unknown
  cop?: BoolOp
  right?: unknown
}

function normalizeProfileFilter(input: unknown): ProfileFilter | null {
  if (!input || typeof input !== 'object') return null
  const saved = input as SavedProfileFilter
  const type = saved.type ?? (saved.kind === 'js' ? 'custom' : 'simple')
  const enabled = saved.enabled !== false

  if (type === 'custom') return { type, enabled, code: saved.code ?? '' }
  if (type === 'compound') {
    return { type, enabled, left: rowRef(saved.left), cop: saved.cop ?? 'AND', right: rowRef(saved.right) }
  }
  return {
    type: 'simple',
    enabled,
    colName: saved.colName ?? null,
    op: saved.op ?? 'contains',
    value: saved.value ?? '',
  }
}

function sortOf(saved: ProfileView, colId: string | undefined) {
  if (!colId) return null
  return { colId, dir: saved.sortDir ?? ('asc' as SortDir) }
}
