import { cx } from '../lib/cx'
import { BOOL_OPS, FILTER_OPS, isValuelessOp } from '../lib/filters'
import type { FilterPlan } from '../lib/filterTree'
import { describePlan } from '../lib/filterTree'
import { filterIssueMessage, filterPanelFoot, filterPanelMeta, foldedInto } from '../lib/labels'
import type { BoolOp, Column, Filter, FilterOp, FilterType } from '../types/workbench'
import styles from './FilterPanel.module.css'

interface FilterPanelProps {
  filters: Filter[]
  columns: Column[]
  /** What the rows resolved to: which run, which were folded in, what is broken. */
  plan: FilterPlan
  onAdd: (type: FilterType) => void
  onPatch: <F extends Filter>(filter: F, patch: Partial<F>) => void
  onRemove: (id: string) => void
}

const EMPTY_HINT =
  'No filter rows yet. Add a simple condition, a custom expression, or a compound of two rows.'

interface RowRef {
  id: string
  label: string
}

/** Filter tab: one editable row per condition, with an on/off flag each. */
export function FilterPanel({ filters, columns, plan, onAdd, onPatch, onRemove }: FilterPanelProps) {
  const refs: RowRef[] = filters.map((f, index) => ({ id: f.id, label: `#${index + 1}` }))

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <span className={styles.meta}>{filterPanelMeta(filters.length, plan.roots.length)}</span>
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
        {filters.map((filter, index) => {
          const issue = plan.issues.get(filter.id)
          const ownerId = plan.consumed.get(filter.id)
          const operands = refs.filter((ref) => ref.id !== filter.id)

          return (
            <div
              key={filter.id}
              className={cx(
                styles.row,
                filter.type === 'compound' && styles.rowCompound,
                ownerId && styles.rowFolded,
              )}
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
                  <OperandSelect
                    label={`Filter ${index + 1} left operand`}
                    value={filter.left}
                    operands={operands}
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
                  <OperandSelect
                    label={`Filter ${index + 1} right operand`}
                    value={filter.right}
                    operands={operands}
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
                title={ownerId ? foldedInto(plan.position.get(ownerId)) : 'Apply this filter'}
                aria-label={`Apply filter ${index + 1}`}
                aria-pressed={filter.enabled}
                disabled={ownerId !== undefined}
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

              {issue ? <span className={styles.issue}>⚠ {filterIssueMessage(issue)}</span> : null}
              {ownerId && !issue ? (
                <span className={styles.folded}>↳ {foldedInto(plan.position.get(ownerId))}</span>
              ) : null}
            </div>
          )
        })}
        {filters.length === 0 ? <div className={styles.empty}>{EMPTY_HINT}</div> : null}
      </div>

      <div className={styles.foot}>{filterPanelFoot(describePlan(plan), plan.issues.size)}</div>
    </div>
  )
}

interface OperandSelectProps {
  label: string
  value: string | null
  operands: RowRef[]
  onChange: (value: string | null) => void
}

/** Points a compound at another row: labelled by position, stored by id. */
function OperandSelect({ label, value, operands, onChange }: OperandSelectProps) {
  const known = value !== null && operands.some((ref) => ref.id === value)

  return (
    <select
      className={cx(styles.select, styles.selectMono)}
      value={known ? value : ''}
      aria-label={label}
      onChange={(event) => onChange(event.target.value || null)}
    >
      {known ? null : <option value="">—</option>}
      {operands.map((ref) => (
        <option key={ref.id} value={ref.id}>
          {ref.label}
        </option>
      ))}
    </select>
  )
}
