import type { Column, Inspect, Row } from '../types/workbench'
import { cellValue } from './cell'
import { typeOf } from './path'

export interface InspectDetail {
  title: string
  kind: string
  json: string
}

/** Builds the inspector panel contents for the current selection. */
export function describeInspect(
  inspect: Inspect | null,
  rows: Row[],
  columns: Column[],
): InspectDetail | null {
  if (!inspect) return null
  const row = rows[inspect.i]
  if (row === undefined) return null

  if (inspect.kind === 'row') {
    return {
      title: `row ${inspect.i + 1}`,
      kind: 'full record',
      json: JSON.stringify(row, null, 2),
    }
  }

  const col = columns.find((c) => c.id === inspect.colId)
  const value = col ? cellValue(col, row, inspect.i) : undefined
  return {
    title: `row ${inspect.i + 1} · ${col ? col.name : '?'}`,
    kind: typeOf(value),
    json: value === undefined ? '' : typeof value === 'string' ? value : JSON.stringify(value, null, 2),
  }
}
