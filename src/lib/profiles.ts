import type {
  ArrayMode,
  BoolOp,
  ColumnKind,
  Filter,
  FilterOp,
  GrainLevel,
  Row,
  SortDir,
  TableView,
  Workspace,
} from '../types/workbench'
import { createView } from './factories'
import { normalizeBoolOp } from './filters'
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
  /** Arrays the table expands into rows; paths, so they need no ids at all. */
  grain?: GrainLevel[]
  keepEmpty?: boolean
}

export interface ProfileColumn {
  name: string
  kind: ColumnKind
  path?: string
  code?: string
  arrayMode?: ArrayMode | null
  arrayIndex?: number
  joinSep?: string
}

/**
 * Like a live filter row, except simple rows point at a column by name and
 * compound rows point at their operands by 1-based row number: both ids are
 * minted fresh on load.
 */
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
  const positionOf = (filterId: string | null): number | null => {
    const index = view.filters.findIndex((f) => f.id === filterId)
    return index === -1 ? null : index + 1
  }
  return {
    name: view.name,
    columns: view.columns.map((c) => ({
      name: c.name,
      kind: c.kind,
      path: c.path,
      code: c.code,
      arrayMode: c.arrayMode,
      arrayIndex: c.arrayIndex,
      joinSep: c.joinSep,
    })),
    filters: view.filters.map((f) => snapshotFilter(f, nameOf, positionOf)),
    sortColName: view.sort ? nameOf(view.sort.colId) : null,
    sortDir: view.sort ? view.sort.dir : null,
    grain: view.grain.map((g) => ({ path: g.path })),
    keepEmpty: view.keepEmpty,
  }
}

function snapshotFilter(
  filter: Filter,
  nameOf: (colId: string) => string | null,
  positionOf: (filterId: string | null) => number | null,
): ProfileFilter {
  if (filter.type === 'custom') return { type: 'custom', enabled: filter.enabled, code: filter.code }
  if (filter.type === 'compound') {
    return {
      type: 'compound',
      enabled: filter.enabled,
      left: positionOf(filter.left),
      cop: filter.cop,
      right: positionOf(filter.right),
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
      filters: liveFilters(saved.filters ?? [], idOf),
      sort: sortOf(saved, idOf(saved.sortColName)),
      grain: normalizeGrain(saved.grain),
      keepEmpty: saved.keepEmpty !== false,
    }
  })
}

/** Profiles saved before arrays could be expanded have no grain to restore. */
function normalizeGrain(input: unknown): GrainLevel[] {
  if (!Array.isArray(input)) return []
  return input
    .map((level) => (level as Partial<GrainLevel>)?.path)
    .filter((path): path is string => typeof path === 'string' && path !== '')
    .map((path) => ({ path }))
}

/** Ids are minted before the rows are built, so compounds can point at them. */
function liveFilters(
  input: unknown[],
  idOf: (name: string | null) => string | undefined,
): Filter[] {
  const saved = input.map(normalizeProfileFilter).filter((f): f is ProfileFilter => f !== null)
  const ids = saved.map(() => createId())
  const at = (position: number | null): string | null =>
    position === null ? null : ids[position - 1] ?? null

  return saved.map((f, index) => {
    const id = ids[index]
    if (f.type === 'custom') return { id, type: 'custom', enabled: f.enabled, code: f.code }
    if (f.type === 'compound') {
      return { id, type: 'compound', enabled: f.enabled, left: at(f.left), cop: f.cop, right: at(f.right) }
    }
    return {
      id,
      type: 'simple',
      enabled: f.enabled,
      // A column that no longer exists leaves the filter inert rather than
      // silently hiding rows.
      colId: idOf(f.colName) ?? '',
      op: f.op,
      value: f.value,
    }
  })
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
  cop?: unknown
  right?: unknown
}

function normalizeProfileFilter(input: unknown): ProfileFilter | null {
  if (!input || typeof input !== 'object') return null
  const saved = input as SavedProfileFilter
  const type = saved.type ?? (saved.kind === 'js' ? 'custom' : 'simple')
  const enabled = saved.enabled !== false

  if (type === 'custom') return { type, enabled, code: saved.code ?? '' }
  if (type === 'compound') {
    return {
      type,
      enabled,
      left: position(saved.left),
      cop: normalizeBoolOp(saved.cop),
      right: position(saved.right),
    }
  }
  return {
    type: 'simple',
    enabled,
    colName: saved.colName ?? null,
    op: saved.op ?? 'contains',
    value: saved.value ?? '',
  }
}

/** Operands are 1-based row numbers; anything else means "unset". */
function position(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) ? value : null
}

function sortOf(saved: ProfileView, colId: string | undefined) {
  if (!colId) return null
  return { colId, dir: saved.sortDir ?? ('asc' as SortDir) }
}
