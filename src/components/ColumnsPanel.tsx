import type { MouseEvent } from 'react'

import { cx } from '../lib/cx'
import type { Column, Density, DisplaySettings } from '../types/workbench'
import styles from './ColumnsPanel.module.css'

interface ColumnsPanelProps {
  columns: Column[]
  display: DisplaySettings
  onAddColumn: (anchor: DOMRect) => void
  onEditColumn: (colId: string, anchor: DOMRect) => void
  onMove: (index: number, dir: -1 | 1) => void
  onDisplayChange: (patch: Partial<DisplaySettings>) => void
}

const DENSITIES: Density[] = ['compact', 'balanced', 'roomy']
const MIN_ROWS = 50
const MAX_ROWS = 5000
const ROW_STEP = 50
const HINT = 'order and edit columns'

/** Columns tab: the column list in table order, plus how the table is drawn. */
export function ColumnsPanel({
  columns,
  display,
  onAddColumn,
  onEditColumn,
  onMove,
  onDisplayChange,
}: ColumnsPanelProps) {
  const anchorOf = (event: MouseEvent<HTMLElement>) => event.currentTarget.getBoundingClientRect()

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <span className={styles.meta}>{HINT}</span>
        <button
          type="button"
          className={styles.add}
          onClick={(event) => onAddColumn(anchorOf(event))}
        >
          + column
        </button>
      </div>

      <div className={styles.list}>
        {columns.map((col, index) => (
          <div key={col.id} className={styles.row}>
            <span className={styles.ordinal}>{index + 1}</span>
            <div className={styles.labels}>
              <div className={styles.nameRow}>
                <span className={styles.name}>{col.name || '(unnamed)'}</span>
                {col.kind === 'js' ? (
                  <span className={styles.fn} title="Computed column">
                    fn
                  </span>
                ) : null}
              </div>
              <span className={styles.source}>{col.kind === 'js' ? col.code : col.path}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.iconBtn}
                title="Move up"
                aria-label={`Move ${col.name} up`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Move down"
                aria-label={`Move ${col.name} down`}
                disabled={index === columns.length - 1}
                onClick={() => onMove(index, 1)}
              >
                ▼
              </button>
              <button
                type="button"
                className={styles.iconBtn}
                title="Edit column"
                aria-label={`Edit ${col.name}`}
                onClick={(event) => onEditColumn(col.id, anchorOf(event))}
              >
                ⋯
              </button>
            </div>
          </div>
        ))}
        {columns.length === 0 ? <div className={styles.empty}>No columns in this table yet.</div> : null}
      </div>

      <div className={styles.display}>
        <div className={cx('wb-segmented', styles.density)}>
          {DENSITIES.map((density) => (
            <button
              key={density}
              type="button"
              className={cx(
                'wb-segmented-option',
                display.density === density && 'wb-segmented-option-active',
              )}
              onClick={() => onDisplayChange({ density })}
            >
              {density}
            </button>
          ))}
        </div>
        <div className={styles.settings}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={display.zebra}
              onChange={(event) => onDisplayChange({ zebra: event.target.checked })}
            />
            zebra rows
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={display.showTypeRow}
              onChange={(event) => onDisplayChange({ showTypeRow: event.target.checked })}
            />
            show sources
          </label>
          <label className={styles.rowCap}>
            max rows
            <input
              className={cx('wb-input', styles.rowCapInput)}
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              step={ROW_STEP}
              value={display.maxRows}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10)
                if (!Number.isNaN(next)) {
                  onDisplayChange({ maxRows: Math.min(MAX_ROWS, Math.max(MIN_ROWS, next)) })
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  )
}
