import type { RowRef, TableView, Workspace } from '../types/workbench'
import { cellValue, toSearchText } from './cell'
import { buildFilterPlan, evaluateNode } from './filterTree'

/** Applies the view's filters, the global search box, then the sort. */
export function selectRows(workspace: Workspace, view: TableView, search: string): RowRef[] {
  const query = search.trim().toLowerCase()
  let out: RowRef[] = workspace.rows.map((row, i) => ({ row, i }))

  for (const root of buildFilterPlan(view.filters).roots) {
    out = out.filter((r) => evaluateNode(root, r.row, r.i, view.columns))
  }

  if (query) {
    out = out.filter((r) =>
      view.columns.some((c) => toSearchText(cellValue(c, r.row, r.i)).toLowerCase().includes(query)),
    )
  }

  const sort = view.sort
  if (sort) {
    const col = view.columns.find((c) => c.id === sort.colId)
    if (col) {
      const dir = sort.dir === 'desc' ? -1 : 1
      out = out.slice().sort((x, y) => {
        const a = cellValue(col, x.row, x.i)
        const b = cellValue(col, y.row, y.i)
        if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir
        const sa = a == null ? '' : String(a)
        const sb = b == null ? '' : String(b)
        return sa.localeCompare(sb, undefined, { numeric: true }) * dir
      })
    }
  }

  return out
}

export interface Aggregate {
  id: string
  name: string
  text: string
}

const MAX_AGGREGATES = 3

/** Sum and mean for the first few numeric columns, shown in the status bar. */
export function computeAggregates(view: TableView, rows: RowRef[]): Aggregate[] {
  const first = rows[0]
  if (!first) return []

  return view.columns
    .filter((c) => typeof cellValue(c, first.row, first.i) === 'number')
    .slice(0, MAX_AGGREGATES)
    .map((col) => {
      const nums = rows
        .map((r) => cellValue(col, r.row, r.i))
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      const sum = nums.reduce((a, b) => a + b, 0)
      const mean = nums.length ? sum / nums.length : 0
      return { id: col.id, name: col.name, text: `Σ ${round(sum)}  x̄ ${round(mean)}` }
    })
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
