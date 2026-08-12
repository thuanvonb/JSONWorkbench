import type { Column, Row, TableView, Workspace } from '../types/workbench'
import { createId } from './id'

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
