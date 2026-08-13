import type {
  Column,
  CompoundFilter,
  CustomFilter,
  Row,
  SimpleFilter,
  TableView,
  Workspace,
} from '../types/workbench'
import { createId } from './id'
import { lastSegment, leafPaths } from './path'

/** How many columns "Infer table" is willing to put on screen at once. */
const MAX_INFERRED_COLUMNS = 14

export function createView(name = 'Table 1', columns: Column[] = []): TableView {
  return { id: createId(), name, columns, filters: [], sort: null }
}

export function createWorkspace(name = 'Workspace 1', rows: Row[] = [], columns: Column[] = []): Workspace {
  const view = createView('Table 1', columns)
  return {
    id: createId(),
    name,
    raw: rows.length ? JSON.stringify(rows, null, 2) : '',
    rows,
    views: [view],
    viewId: view.id,
  }
}

export function duplicateView(view: TableView): TableView {
  return {
    id: createId(),
    name: `${view.name} copy`,
    columns: view.columns.map((c) => ({ ...c })),
    filters: view.filters.map((f) => ({ ...f })),
    sort: view.sort,
  }
}

/** New filter rows start switched off, so typing one never hides data mid-edit. */
export function createSimpleFilter(colId: string): SimpleFilter {
  return { id: createId(), type: 'simple', enabled: false, colId, op: 'contains', value: '' }
}

export function createCustomFilter(): CustomFilter {
  return { id: createId(), type: 'custom', enabled: false, code: '' }
}

/** Points at the first two rows when there are rows to combine, otherwise unset. */
export function createCompoundFilter(rowCount: number): CompoundFilter {
  return {
    id: createId(),
    type: 'compound',
    enabled: false,
    left: rowCount >= 1 ? 1 : null,
    cop: 'AND',
    right: rowCount >= 2 ? 2 : null,
  }
}

/** A first pass at a table: one path column per leaf key of the records. */
export function inferColumns(rows: Row[]): Column[] {
  return leafPaths(rows)
    .slice(0, MAX_INFERRED_COLUMNS)
    .map((path) => ({ id: createId(), name: lastSegment(path), kind: 'path' as const, path }))
}
