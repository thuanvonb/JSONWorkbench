import { createView, createWorkspace, duplicateView } from '../lib/factories'
import type { Column, Filter, Row, TableView, Workspace } from '../types/workbench'

export interface WorkbenchState {
  workspaces: Workspace[]
  activeId: string | null
}

export type WorkbenchAction =
  | { type: 'workspace/add' }
  | { type: 'workspace/select'; id: string }
  | { type: 'workspace/close'; id: string }
  | { type: 'rename'; id: string; name: string }
  /** Replaces the active workspace's records. `keepViews` preserves tables when the shape matches. */
  | { type: 'data/load'; raw: string; rows: Row[]; keepViews: boolean }
  | { type: 'view/add' }
  | { type: 'view/select'; id: string }
  | { type: 'view/duplicate'; id: string }
  | { type: 'view/close'; id: string }
  /** Swaps every table for the ones rebuilt from a saved profile. */
  | { type: 'views/replace'; views: TableView[] }
  | { type: 'column/add'; column: Column }
  | { type: 'column/update'; column: Column }
  | { type: 'column/remove'; id: string }
  | { type: 'column/move'; index: number; dir: -1 | 1 }
  | { type: 'sort/toggle'; colId: string }
  | { type: 'filter/add'; filter: Filter }
  | { type: 'filter/remove'; id: string }

export function workbenchReducer(state: WorkbenchState, action: WorkbenchAction): WorkbenchState {
  switch (action.type) {
    case 'workspace/add': {
      const workspace = createWorkspace(`Workspace ${state.workspaces.length + 1}`)
      return { workspaces: [...state.workspaces, workspace], activeId: workspace.id }
    }

    case 'workspace/select':
      return { ...state, activeId: action.id }

    case 'workspace/close': {
      const left = state.workspaces.filter((w) => w.id !== action.id)
      if (left.length === 0) {
        const fresh = createWorkspace('Workspace 1')
        return { workspaces: [fresh], activeId: fresh.id }
      }
      return { workspaces: left, activeId: state.activeId === action.id ? left[0].id : state.activeId }
    }

    // A rename targets either a workspace tab or a table tab; ids are unique
    // across both, so one action covers them.
    case 'rename':
      return {
        ...state,
        workspaces: state.workspaces.map((w) => {
          const renamed = w.id === action.id ? { ...w, name: action.name } : w
          if (!renamed.views.some((v) => v.id === action.id)) return renamed
          return {
            ...renamed,
            views: renamed.views.map((v) => (v.id === action.id ? { ...v, name: action.name } : v)),
          }
        }),
      }

    case 'data/load':
      return patchActive(state, () => {
        if (action.keepViews) return { raw: action.raw, rows: action.rows }
        // A fresh load starts with no columns: the user picks what to show.
        const view = createView('Table 1')
        return { raw: action.raw, rows: action.rows, views: [view], viewId: view.id }
      })

    case 'view/add':
      return patchActive(state, (w) => {
        const view = createView(`Table ${w.views.length + 1}`)
        return { views: [...w.views, view], viewId: view.id }
      })

    case 'view/select':
      return patchActive(state, () => ({ viewId: action.id }))

    case 'view/duplicate':
      return patchActive(state, (w) => {
        const source = w.views.find((v) => v.id === action.id)
        if (!source) return {}
        const copy = duplicateView(source)
        return { views: [...w.views, copy], viewId: copy.id }
      })

    case 'view/close':
      return patchActive(state, (w) => {
        if (w.views.length <= 1) return {}
        const left = w.views.filter((v) => v.id !== action.id)
        return { views: left, viewId: w.viewId === action.id ? left[0].id : w.viewId }
      })

    case 'views/replace':
      return patchActive(state, () => {
        if (action.views.length === 0) return {}
        return { views: action.views, viewId: action.views[0].id }
      })

    case 'column/add':
      return patchView(state, (v) => ({ columns: [...v.columns, action.column] }))

    case 'column/update':
      return patchView(state, (v) => ({
        columns: v.columns.map((c) => (c.id === action.column.id ? { ...c, ...action.column } : c)),
      }))

    // Dropping a column also drops the filters and sort that referenced it.
    case 'column/remove':
      return patchView(state, (v) => ({
        columns: v.columns.filter((c) => c.id !== action.id),
        filters: v.filters.filter((f) => f.kind === 'js' || f.colId !== action.id),
        sort: v.sort && v.sort.colId === action.id ? null : v.sort,
      }))

    case 'column/move':
      return patchView(state, (v) => {
        const target = action.index + action.dir
        if (target < 0 || target >= v.columns.length) return {}
        const columns = v.columns.slice()
        const moved = columns[action.index]
        columns[action.index] = columns[target]
        columns[target] = moved
        return { columns }
      })

    // asc -> desc -> unsorted
    case 'sort/toggle':
      return patchView(state, (v) => ({
        sort:
          v.sort && v.sort.colId === action.colId
            ? v.sort.dir === 'asc'
              ? { colId: action.colId, dir: 'desc' }
              : null
            : { colId: action.colId, dir: 'asc' },
      }))

    case 'filter/add':
      return patchView(state, (v) => ({ filters: [...v.filters, action.filter] }))

    case 'filter/remove':
      return patchView(state, (v) => ({ filters: v.filters.filter((f) => f.id !== action.id) }))

    default:
      return state
  }
}

function patchActive(
  state: WorkbenchState,
  patch: (workspace: Workspace) => Partial<Workspace>,
): WorkbenchState {
  return {
    ...state,
    workspaces: state.workspaces.map((w) => (w.id === state.activeId ? { ...w, ...patch(w) } : w)),
  }
}

function patchView(
  state: WorkbenchState,
  patch: (view: TableView) => Partial<TableView>,
): WorkbenchState {
  return patchActive(state, (w) => ({
    views: w.views.map((v) => (v.id === w.viewId ? { ...v, ...patch(v) } : v)),
  }))
}
