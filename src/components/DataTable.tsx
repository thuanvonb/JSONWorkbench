import type { MouseEvent } from 'react'

import { cellValue, formatCell } from '../lib/cell'
import { cx } from '../lib/cx'
import type { Column, Density, DisplaySettings, Inspect, RowRef, Sort } from '../types/workbench'
import styles from './DataTable.module.css'

interface DataTableProps {
  columns: Column[]
  rows: RowRef[]
  sort: Sort | null
  display: DisplaySettings
  inspect: Inspect | null
  onSort: (colId: string) => void
  onEditColumn: (colId: string, anchor: DOMRect) => void
  onInspectRow: (index: number) => void
  onInspectCell: (index: number, colId: string) => void
}

const DENSITY_CLASS: Record<Density, string> = {
  compact: styles.compact,
  balanced: styles.balanced,
  roomy: styles.roomy,
}

export function DataTable({
  columns,
  rows,
  sort,
  display,
  inspect,
  onSort,
  onEditColumn,
  onInspectRow,
  onInspectCell,
}: DataTableProps) {
  return (
    <table className={cx(styles.table, DENSITY_CLASS[display.density])}>
      <thead className={styles.thead}>
        <tr>
          <th className={styles.indexHead}>#</th>
          {columns.map((col) => {
            const sorted = sort?.colId === col.id
            return (
              <th key={col.id} className={cx(styles.head, col.kind === 'js' && styles.headJs)}>
                <div className={styles.headInner}>
                  <button
                    type="button"
                    className={cx(styles.headName, sorted && styles.headNameSorted)}
                    title="Sort"
                    onClick={() => onSort(col.id)}
                  >
                    {col.name || '(unnamed)'}
                  </button>
                  <span className={styles.arrow}>{sorted ? (sort.dir === 'asc' ? '▲' : '▼') : ''}</span>
                  {col.kind === 'js' ? (
                    <span className={styles.fnTag} title="Computed column">
                      fn
                    </span>
                  ) : null}
                  <button
                    type="button"
                    className={styles.headMenu}
                    title="Edit column"
                    aria-label={`Edit column ${col.name}`}
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                      event.stopPropagation()
                      onEditColumn(col.id, event.currentTarget.getBoundingClientRect())
                    }}
                  >
                    ⋯
                  </button>
                </div>
                {display.showTypeRow ? (
                  <div className={styles.headSub}>{col.kind === 'js' ? col.code : col.path}</div>
                ) : null}
              </th>
            )
          })}
          <th className={styles.tailHead} />
        </tr>
      </thead>
      <tbody>
        {rows.map((ref, position) => {
          const rowSelected = inspect?.i === ref.i
          return (
            <tr
              key={ref.i}
              className={cx(
                styles.row,
                display.zebra && position % 2 === 1 && styles.rowAlt,
                rowSelected && styles.rowSelected,
              )}
            >
              <td
                className={styles.index}
                title="Inspect full record"
                onClick={() => onInspectRow(ref.i)}
              >
                {ref.i + 1}
              </td>
              {columns.map((col) => {
                const cell = formatCell(cellValue(col, ref.row, ref.i))
                const cellSelected =
                  inspect?.kind === 'cell' && inspect.i === ref.i && inspect.colId === col.id
                return (
                  <td
                    key={col.id}
                    className={cx(styles.cell, styles[cell.variant], cellSelected && styles.cellSelected)}
                    onClick={() => onInspectCell(ref.i, col.id)}
                  >
                    {cell.text}
                  </td>
                )
              })}
              <td className={styles.tail} />
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
