import { cx } from '../lib/cx'
import { formatCell } from '../lib/cell'
import { evaluate, isCellError } from '../lib/expression'
import { ARRAY_MODES, entryIndex, joinSeparator, rowLabel } from '../lib/grain'
import { arrayModeHint } from '../lib/labels'
import { lastSegment } from '../lib/path'
import type { PathInfo } from '../lib/path'
import { COLUMN_POPOVER_SIZE } from '../lib/popover'
import type { ColumnDraft } from '../types/ui'
import type { ArrayMode, RowRef } from '../types/workbench'
import { Popover } from './Popover'
import styles from './ColumnPopover.module.css'

interface ColumnPopoverProps {
  x: number
  y: number
  draft: ColumnDraft
  paths: PathInfo[]
  /** First row on screen, used to preview a computed column against real data. */
  sampleRef: RowRef | null
  /**
   * The array this column crosses and the mode in force, or null when the path
   * never meets one. Picking a mode applies at once — an expanded array changes
   * every row of the table, not just this column.
   */
  array: { label: string; mode: ArrayMode | null } | null
  onChange: (patch: Partial<ColumnDraft>) => void
  onPickArrayMode: (mode: ArrayMode) => void
  onEntryIndex: (index: number) => void
  onJoinSep: (separator: string) => void
  onApply: () => void
  onRemove: () => void
  onClose: () => void
}

const MAX_SUGGESTIONS = 40

export function ColumnPopover({
  x,
  y,
  draft,
  paths,
  sampleRef,
  array,
  onChange,
  onPickArrayMode,
  onEntryIndex,
  onJoinSep,
  onApply,
  onRemove,
  onClose,
}: ColumnPopoverProps) {
  const query = draft.path.toLowerCase()
  const suggestions = paths
    .filter((p) => !query || p.path.toLowerCase().includes(query))
    .slice(0, MAX_SUGGESTIONS)

  // Keep following the path while the header still holds its auto-derived name.
  const pickPath = (path: string) => {
    const autoNamed = !draft.name || draft.name === lastSegment(draft.path)
    onChange({ path, name: autoNamed ? lastSegment(path) : draft.name })
  }

  return (
    <Popover
      x={x}
      y={y}
      width={COLUMN_POPOVER_SIZE.width}
      label={draft.isNew ? 'Add column' : 'Edit column'}
      onClose={onClose}
    >
      <div className={styles.body}>
        <div className="wb-segmented">
          <button
            type="button"
            className={cx('wb-segmented-option', draft.kind === 'path' && 'wb-segmented-option-active')}
            onClick={() => onChange({ kind: 'path' })}
          >
            Path
          </button>
          <button
            type="button"
            className={cx('wb-segmented-option', draft.kind === 'js' && 'wb-segmented-option-active')}
            onClick={() => onChange({ kind: 'js' })}
          >
            JavaScript
          </button>
        </div>

        <div className="wb-field">
          <label className="wb-label" htmlFor="column-header">
            Header
          </label>
          <input
            id="column-header"
            className="wb-input"
            value={draft.name}
            placeholder="column name"
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>

        {draft.kind === 'path' ? (
          <div className="wb-field">
            <label className="wb-label" htmlFor="column-path">
              Path
            </label>
            <input
              id="column-path"
              className={cx('wb-input', styles.pathInput)}
              value={draft.path}
              placeholder="user.address.city"
              spellCheck={false}
              onChange={(event) => onChange({ path: event.target.value })}
            />
            <div className={styles.suggestions}>
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.path}
                  type="button"
                  className={styles.suggestion}
                  onClick={() => pickPath(suggestion.path)}
                >
                  <span className={styles.suggestionPath}>{suggestion.path}</span>
                  <span className={styles.suggestionType}>{suggestion.type}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="wb-field">
            <span className="wb-label">
              Expression — <code>row</code>, <code>i</code> in scope
            </span>
            <textarea
              className={cx('wb-input', styles.code)}
              value={draft.code}
              placeholder="row.total / row.qty"
              spellCheck={false}
              onChange={(event) => onChange({ code: event.target.value })}
            />
            <div className={styles.preview}>{previewExpression(draft.code, sampleRef)}</div>
          </div>
        )}

        {array ? (
          <div className="wb-field">
            <span className="wb-label">
              Array — <code>{array.label}</code>
            </span>
            <div className={styles.modes}>
              {ARRAY_MODES.map((mode) => {
                const picked = array.mode === mode.id
                return (
                  <div key={mode.id} className={cx(styles.mode, picked && styles.modePicked)}>
                    <button
                      type="button"
                      className={styles.modePick}
                      onClick={() => onPickArrayMode(mode.id)}
                    >
                      <span className={styles.dot}>{picked ? '●' : ''}</span>
                      {mode.name}
                    </button>
                    {mode.input === 'index' ? (
                      <input
                        className={styles.modeInput}
                        value={String(entryIndex(draft))}
                        aria-label="Array entry index"
                        onChange={(event) => onEntryIndex(Number(event.target.value) || 0)}
                      />
                    ) : null}
                    {mode.input === 'join' ? (
                      <input
                        className={styles.modeInput}
                        value={joinSeparator(draft)}
                        aria-label="Join separator"
                        onChange={(event) => onJoinSep(event.target.value)}
                      />
                    ) : null}
                  </div>
                )
              })}
            </div>
            <div className={styles.hint}>{arrayModeHint(array.mode)}</div>
          </div>
        ) : null}

        <div className={styles.actions}>
          <button type="button" className={cx('wb-btn-primary', styles.apply)} onClick={onApply}>
            {draft.isNew ? 'Add column' : 'Apply'}
          </button>
          <button
            type="button"
            className={cx('wb-btn', styles.secondary, !draft.isNew && styles.remove)}
            onClick={onRemove}
          >
            {draft.isNew ? 'Cancel' : 'Remove'}
          </button>
        </div>
      </div>
    </Popover>
  )
}

function previewExpression(code: string, ref: RowRef | null): string {
  if (!code || ref === null) return ''
  const value = evaluate(code, ref.row, ref.i, ref.scopes[ref.scopes.length - 1])
  if (isCellError(value)) return `⚠ ${value.__err}`
  return `row ${rowLabel(ref)} → ${formatCell(value).text}`
}
