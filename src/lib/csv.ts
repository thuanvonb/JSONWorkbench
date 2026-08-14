import type { Column, RowRef } from '../types/workbench'
import { cellValue } from './cell'
import { toSearchText } from './text'

export function toCsv(columns: Column[], rows: RowRef[]): string {
  const lines = [columns.map((c) => escapeCsv(c.name)).join(',')]
  for (const r of rows) {
    lines.push(columns.map((c) => escapeCsv(toSearchText(cellValue(c, r)))).join(','))
  }
  return lines.join('\n')
}

function escapeCsv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`
}

export function csvFileName(workspaceName: string, viewName: string): string {
  return `${`${workspaceName || 'data'}-${viewName || 'table'}`.replace(/\s+/g, '-').toLowerCase()}.csv`
}
