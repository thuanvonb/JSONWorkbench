import type { MouseEvent } from 'react'

import { cellValue, formatCell } from '../lib/cell'
import { cx } from '../lib/cx'
import type { ColumnGrain } from '../lib/grain'
import { isRepeatedCell, isRepeatedRow, rowLabel } from '../lib/grain'
import type { Column, Density, DisplaySettings, Inspect, RowRef, Sort } from '../types/workbench'
import styles from './DataTable.module.css'

interface DataTableProps {
  columns: Column[]
  rows: RowRef[]
  sort: Sort | null
  display: DisplaySettings
  inspect: Inspect | null
  /** How each column meets the arrays around it, keyed by column id. */
  grains: Map<string, ColumnGrain>
  onSort: (colId: string) => void
  onEditColumn: (colId: string, anchor: DOMRect) => void
  onInspectRow: (ref: RowRef) => void
  onInspectCell: (ref: RowRef, colId: string) => void
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
  grains,
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
            const badge = grains.get(col.id)?.badge ?? null
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
                  {badge ? (
                    <span
                      className={cx(styles.arrayTag, badge.accent && styles.arrayTagOn)}
                      title={badge.title}
                    >
                      {badge.text}
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
          const rowSelected = inspect?.key === ref.key
          return (
            <tr
              key={ref.key}
              className={cx(
                styles.row,
                display.zebra && position % 2 === 1 && styles.rowAlt,
                rowSelected && styles.rowSelected,
              )}
            >
              <td
                className={cx(styles.index, isRepeatedRow(ref) && styles.indexRepeated)}
                title="Inspect full record"
                onClick={() => onInspectRow(ref)}
              >
                {rowLabel(ref)}
              </td>
              {columns.map((col) => {
                const cell = formatCell(cellValue(col, ref))
                const cellSelected =
                  inspect?.kind === 'cell' && inspect.key === ref.key && inspect.colId === col.id
                // A column reading from above the level that moved on is showing
                // the same value as the row before it.
                const repeated = isRepeatedCell(ref, grains.get(col.id)?.level ?? 0)
                return (
                  <td
                    key={col.id}
                    className={cx(
                      styles.cell,
                      styles[cell.variant],
                      repeated && styles.cellRepeated,
                      cellSelected && styles.cellSelected,
                    )}
                    onClick={() => onInspectCell(ref, col.id)}
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
