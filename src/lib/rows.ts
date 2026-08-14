import type { RowRef, TableView } from '../types/workbench'
import { cellValue } from './cell'
import { buildFilterPlan, evaluateNode } from './filterTree'
import { toSearchText } from './text'

/**
 * Applies the view's filters, the global search box, then the sort. The rows
 * come in already expanded by the view's grain (`expandRows` in `lib/grain.ts`),
 * so everything here works one table row at a time.
 */
export function selectRows(rows: RowRef[], view: TableView, search: string): RowRef[] {
  const query = search.trim().toLowerCase()
  let out = rows

  for (const root of buildFilterPlan(view.filters).roots) {
    out = out.filter((r) => evaluateNode(root, r, view.columns))
  }

  if (query) {
    out = out.filter((r) =>
      view.columns.some((c) => toSearchText(cellValue(c, r)).toLowerCase().includes(query)),
    )
  }

  const sort = view.sort
  if (sort) {
    const col = view.columns.find((c) => c.id === sort.colId)
    if (col) {
      const dir = sort.dir === 'desc' ? -1 : 1
      out = out.slice().sort((x, y) => {
        const a = cellValue(col, x)
        const b = cellValue(col, y)
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
    .filter((c) => typeof cellValue(c, first) === 'number')
    .slice(0, MAX_AGGREGATES)
    .map((col) => {
      const nums = rows
        .map((r) => cellValue(col, r))
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
      const sum = nums.reduce((a, b) => a + b, 0)
      const mean = nums.length ? sum / nums.length : 0
      return { id: col.id, name: col.name, text: `Σ ${round(sum)}  x̄ ${round(mean)}` }
    })
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
