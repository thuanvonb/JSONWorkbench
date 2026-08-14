import type { Column, Inspect, Row, RowRef } from '../types/workbench'
import { cellValue } from './cell'
import { rootRef, rowLabel } from './grain'
import { typeOf } from './path'

export interface InspectDetail {
  title: string
  kind: string
  json: string
}

/**
 * Builds the inspector panel contents for the current selection. The selection
 * is keyed by row, so it is looked up among the visible rows first; a row that a
 * grain change took away still resolves to its record.
 */
export function describeInspect(
  inspect: Inspect | null,
  visible: RowRef[],
  rows: Row[],
  columns: Column[],
): InspectDetail | null {
  if (!inspect) return null
  const ref = visible.find((r) => r.key === inspect.key) ?? null
  const row = ref ? ref.row : rows[inspect.i]
  if (row === undefined) return null
  const label = ref ? rowLabel(ref) : String(inspect.i + 1)

  if (inspect.kind === 'row') {
    return {
      title: `row ${label}`,
      // The inspector always shows the whole record, which several rows share
      // once a grain is expanding arrays.
      kind: ref && ref.idx.length ? `full record · record ${inspect.i + 1}` : 'full record',
      json: JSON.stringify(row, null, 2),
    }
  }

  const col = columns.find((c) => c.id === inspect.colId)
  const value = col ? cellValue(col, ref ?? rootRef(row, inspect.i)) : undefined
  return {
    title: `row ${label} · ${col ? col.name : '?'}`,
    kind: typeOf(value),
    json: value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  }
}
