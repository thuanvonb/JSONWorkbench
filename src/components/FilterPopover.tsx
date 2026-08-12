import { cx } from '../lib/cx'
import { FILTER_OPS, isValuelessOp } from '../lib/filters'
import { FILTER_POPOVER_SIZE } from '../lib/popover'
import type { FilterDraft } from '../types/ui'
import { JS_FILTER_OPTION } from '../types/ui'
import type { Column, FilterOp } from '../types/workbench'
import { Popover } from './Popover'
import styles from './FilterPopover.module.css'

interface FilterPopoverProps {
  x: number
  y: number
  draft: FilterDraft
  columns: Column[]
  onChange: (patch: Partial<FilterDraft>) => void
  onApply: () => void
  onClose: () => void
}

export function FilterPopover({ x, y, draft, columns, onChange, onApply, onClose }: FilterPopoverProps) {
  const isJs = draft.colId === JS_FILTER_OPTION

  return (
    <Popover x={x} y={y} width={FILTER_POPOVER_SIZE.width} label="Add filter" onClose={onClose}>
      <div className={styles.body}>
        <div className={styles.title}>Add filter</div>
        <select
          className={cx('wb-input', styles.select)}
          value={draft.colId}
          aria-label="Filter target"
          onChange={(event) => onChange({ colId: event.target.value })}
        >
          {columns.map((col) => (
            <option key={col.id} value={col.id}>
              {col.name || '(unnamed)'}
            </option>
          ))}
          <option value={JS_FILTER_OPTION}>JavaScript expression…</option>
        </select>

        {isJs ? (
          <textarea
            className={cx('wb-input', styles.code)}
            value={draft.code}
            placeholder="row.total > 100 && row.status !== 'void'"
            spellCheck={false}
            aria-label="Filter expression"
            onChange={(event) => onChange({ code: event.target.value })}
          />
        ) : (
          <div className={styles.condition}>
            <select
              className={cx('wb-input', styles.op)}
              value={draft.op}
              aria-label="Filter operator"
              onChange={(event) => onChange({ op: event.target.value as FilterOp })}
            >
              {FILTER_OPS.map((op) => (
                <option key={op.id} value={op.id}>
                  {op.name}
                </option>
              ))}
            </select>
            {isValuelessOp(draft.op) ? null : (
              <input
                className={cx('wb-input', styles.value)}
                value={draft.value}
                placeholder="value"
                aria-label="Filter value"
                onChange={(event) => onChange({ value: event.target.value })}
              />
            )}
          </div>
        )}

        <button type="button" className={cx('wb-btn-primary', styles.apply)} onClick={onApply}>
          Add filter
        </button>
      </div>
    </Popover>
  )
}
