import { cx } from '../lib/cx'
import { formatCell } from '../lib/cell'
import { evaluate, isCellError } from '../lib/expression'
import { lastSegment } from '../lib/path'
import type { PathInfo } from '../lib/path'
import { COLUMN_POPOVER_SIZE } from '../lib/popover'
import type { ColumnDraft } from '../types/ui'
import type { Row } from '../types/workbench'
import { Popover } from './Popover'
import styles from './ColumnPopover.module.css'

interface ColumnPopoverProps {
  x: number
  y: number
  draft: ColumnDraft
  paths: PathInfo[]
  /** First record of the workspace, used to preview a computed column. */
  sampleRow: Row | null
  onChange: (patch: Partial<ColumnDraft>) => void
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
  sampleRow,
  onChange,
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
            <div className={styles.preview}>{previewExpression(draft.code, sampleRow)}</div>
          </div>
        )}

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

function previewExpression(code: string, sampleRow: Row | null): string {
  if (!code || sampleRow === null) return ''
  const value = evaluate(code, sampleRow, 0)
  if (isCellError(value)) return `⚠ ${value.__err}`
  return `row 1 → ${formatCell(value).text}`
}
