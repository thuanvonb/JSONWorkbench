import { cx } from '../lib/cx'
import { BOOL_OPS, FILTER_OPS, isApplied, isValuelessOp } from '../lib/filters'
import { filterPanelFoot, filterPanelMeta } from '../lib/labels'
import type { BoolOp, Column, Filter, FilterOp, FilterType } from '../types/workbench'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  filters: Filter[]
  columns: Column[]
  onAdd: (type: FilterType) => void
  onPatch: <F extends Filter>(filter: F, patch: Partial<F>) => void
  onRemove: (id: string) => void
}

const EMPTY_HINT =
  'No filter rows yet. Add a simple condition, a custom expression, or a compound of two rows.'

/** Filter tab: one editable row per condition, with an on/off flag each. */
export function FilterPanel({ filters, columns, onAdd, onPatch, onRemove }: FilterPanelProps) {
  const applied = filters.filter(isApplied).length
  const compounds = filters.filter((f) => f.type === 'compound').length
  // Compound rows point at other rows by their 1-based position, never at themselves.
  const rowNumbers = filters.map((_, index) => String(index + 1))

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <span className={styles.meta}>{filterPanelMeta(filters.length, applied)}</span>
        <button type="button" className={cx(styles.add, styles.addAccent)} onClick={() => onAdd('simple')}>
          + simple
        </button>
        <button type="button" className={styles.add} onClick={() => onAdd('compound')}>
          + compound
        </button>
        <button type="button" className={styles.add} onClick={() => onAdd('custom')}>
          + custom
        </button>
      </div>

      <div className={styles.columnHead}>
        <span className={styles.headId}>id</span>
        <span>target</span>
        <span>operator</span>
        <span>value</span>
        <span className={styles.headOn}>on</span>
        <span />
      </div>

      <div className={styles.rows}>
        {filters.map((filter, index) => (
          <div
            key={filter.id}
            className={cx(styles.row, filter.type === 'compound' && styles.rowCompound)}
          >
            <span
              className={cx(styles.ordinal, filter.type === 'compound' && styles.ordinalCompound)}
            >
              {index + 1}
            </span>

            {filter.type === 'simple' ? (
              <>
                <select
                  className={styles.select}
                  value={filter.colId || columns[0]?.id || ''}
                  aria-label={`Filter ${index + 1} column`}
                  onChange={(event) => onPatch(filter, { colId: event.target.value })}
                >
                  {columns.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.name || '(unnamed)'}
                    </option>
                  ))}
                </select>
                <select
                  className={cx(styles.select, styles.selectTight)}
                  value={filter.op}
                  aria-label={`Filter ${index + 1} operator`}
                  onChange={(event) => onPatch(filter, { op: event.target.value as FilterOp })}
                >
                  {FILTER_OPS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
                <input
                  className={cx(styles.value, isValuelessOp(filter.op) && styles.valueOff)}
                  value={filter.value}
                  placeholder={isValuelessOp(filter.op) ? '—' : 'value'}
                  disabled={isValuelessOp(filter.op)}
                  spellCheck={false}
                  aria-label={`Filter ${index + 1} value`}
                  onChange={(event) => onPatch(filter, { value: event.target.value })}
                />
              </>
            ) : null}

            {filter.type === 'compound' ? (
              <>
                <RowRefSelect
                  label={`Filter ${index + 1} left operand`}
                  value={filter.left}
                  rowNumbers={rowNumbers}
                  self={index + 1}
                  onChange={(left) => onPatch(filter, { left })}
                />
                <select
                  className={cx(styles.select, styles.selectTight, styles.selectMono)}
                  value={filter.cop}
                  aria-label={`Filter ${index + 1} connective`}
                  onChange={(event) => onPatch(filter, { cop: event.target.value as BoolOp })}
                >
                  {BOOL_OPS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.name}
                    </option>
                  ))}
                </select>
                <RowRefSelect
                  label={`Filter ${index + 1} right operand`}
                  value={filter.right}
                  rowNumbers={rowNumbers}
                  self={index + 1}
                  onChange={(right) => onPatch(filter, { right })}
                />
              </>
            ) : null}

            {filter.type === 'custom' ? (
              <input
                className={cx(styles.value, styles.code)}
                value={filter.code}
                placeholder="row.total > 100 && row.status !== 'void'"
                spellCheck={false}
                aria-label={`Filter ${index + 1} expression`}
                onChange={(event) => onPatch(filter, { code: event.target.value })}
              />
            ) : null}

            <button
              type="button"
              className={cx(styles.flag, filter.enabled && styles.flagOn)}
              title="Apply this filter"
              aria-label={`Apply filter ${index + 1}`}
              aria-pressed={filter.enabled}
              onClick={() => onPatch(filter, { enabled: !filter.enabled })}
            >
              {filter.enabled ? '✓' : ''}
            </button>
            <button
              type="button"
              className={styles.remove}
              title="Delete row"
              aria-label={`Delete filter ${index + 1}`}
              onClick={() => onRemove(filter.id)}
            >
              ×
            </button>
          </div>
        ))}
        {filters.length === 0 ? <div className={styles.empty}>{EMPTY_HINT}</div> : null}
      </div>

      <div className={styles.foot}>{filterPanelFoot(compounds)}</div>
    </div>
  )
}

interface RowRefSelectProps {
  label: string
  value: number | null
  rowNumbers: string[]
  /** This row's own number, which it may not point at. */
  self: number
  onChange: (value: number | null) => void
}

function RowRefSelect({ label, value, rowNumbers, self, onChange }: RowRefSelectProps) {
  const options = rowNumbers.filter((n) => n !== String(self))

  return (
    <select
      className={cx(styles.select, styles.selectMono)}
      value={value === null ? '' : String(value)}
      aria-label={label}
      onChange={(event) => onChange(event.target.value ? Number(event.target.value) : null)}
    >
      {options.length === 0 ? <option value="">—</option> : null}
      {options.map((n) => (
        <option key={n} value={n}>{`#${n}`}</option>
      ))}
    </select>
  )
}
