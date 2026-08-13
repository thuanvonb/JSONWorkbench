import type { ColumnKind, FilterOp, Row, SortDir, TableView, Workspace } from '../types/workbench'
import { createView } from './factories'
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

export type ProfileFilter =
  | { kind: 'col'; colName: string | null; op: FilterOp; value: string }
  | { kind: 'js'; code: string }

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
    filters: view.filters.map((f) =>
      f.kind === 'js'
        ? { kind: 'js', code: f.code }
        : { kind: 'col', colName: nameOf(f.colId), op: f.op, value: f.value },
    ),
    sortColName: view.sort ? nameOf(view.sort.colId) : null,
    sortDir: view.sort ? view.sort.dir : null,
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
      filters: saved.filters.map((f) =>
        f.kind === 'js'
          ? { id: createId(), kind: 'js' as const, code: f.code }
          : {
              id: createId(),
              kind: 'col' as const,
              // A column that no longer exists leaves the filter inert rather
              // than silently hiding rows.
              colId: idOf(f.colName) ?? '',
              op: f.op,
              value: f.value,
            },
      ),
      sort: sortOf(saved, idOf(saved.sortColName)),
    }
  })
}

function sortOf(saved: ProfileView, colId: string | undefined) {
  if (!colId) return null
  return { colId, dir: saved.sortDir ?? ('asc' as SortDir) }
}
