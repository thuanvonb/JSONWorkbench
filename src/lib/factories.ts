import type {
  Column,
  CompoundFilter,
  CustomFilter,
  Filter,
  Row,
  SimpleFilter,
  TableView,
  Workspace,
} from '../types/workbench'
import type { ColumnDraft } from '../types/ui'
import { createId } from './id'
import { lastSegment, leafPaths } from './path'

/** How many columns "Infer table" is willing to put on screen at once. */
const MAX_INFERRED_COLUMNS = 14

export function createView(name = 'Table 1', columns: Column[] = []): TableView {
  return { id: createId(), name, columns, filters: [], sort: null, grain: [], keepEmpty: true }
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
    grain: view.grain.map((g) => ({ ...g })),
    keepEmpty: view.keepEmpty,
  }
}

/** New filter rows start switched off, so typing one never hides data mid-edit. */
export function createSimpleFilter(colId: string): SimpleFilter {
  return { id: createId(), type: 'simple', enabled: false, colId, op: 'contains', value: '' }
}

export function createCustomFilter(): CustomFilter {
  return { id: createId(), type: 'custom', enabled: false, code: '' }
}

/** Points at the first two existing rows, when there are rows to combine. */
export function createCompoundFilter(existing: Filter[]): CompoundFilter {
  return {
    id: createId(),
    type: 'compound',
    enabled: false,
    left: existing[0]?.id ?? null,
    cop: 'AND',
    right: existing[1]?.id ?? null,
  }
}

/** The column the popover would write, live-applied as well as on Apply. */
export function columnFromDraft(draft: ColumnDraft): Column {
  return {
    id: draft.id,
    name: draft.name || draft.path || 'column',
    kind: draft.kind,
    path: draft.path,
    code: draft.code,
    arrayMode: draft.arrayMode ?? null,
    arrayIndex: draft.arrayIndex,
    joinSep: draft.joinSep,
  }
}

/** One column reading a path out of each record, named after its last segment. */
export function createPathColumn(path: string, name = lastSegment(path)): Column {
  return { id: createId(), name, kind: 'path', path }
}

/** A first pass at a table: one path column per leaf key of the records. */
export function inferColumns(rows: Row[]): Column[] {
  return leafPaths(rows).slice(0, MAX_INFERRED_COLUMNS).map((path) => createPathColumn(path))
}
