import { useEscapeKey } from '../hooks/useEscapeKey'
import { stopPropagation } from '../lib/events'
import styles from './OffsetConfirm.module.css'

interface OffsetConfirmProps {
  title: string
  body: string
  /** Re-roots this table, dropping the setup that read from the old root. */
  onConfirm: () => void
  /** Keeps this table as it is and opens the path as a table of its own. */
  onNewTable: () => void
  onCancel: () => void
}

/** Asked before an offset throws away columns and filters the user built. */
export function OffsetConfirm({ title, body, onConfirm, onNewTable, onCancel }: OffsetConfirmProps) {
  useEscapeKey(onCancel)

  return (
    <div className={styles.scrim} onClick={onCancel}>
      <div
        className={styles.card}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={stopPropagation}
      >
        <div className={styles.body}>
          <div className={styles.title}>{title}</div>
          <div className={styles.text}>{body}</div>
        </div>
        <div className={styles.footer}>
          <button type="button" className="wb-btn" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="wb-btn" onClick={onNewTable}>
            Open in a new table
          </button>
          <button type="button" className="wb-btn-primary" onClick={onConfirm}>
            Drop and offset
          </button>
        </div>
      </div>
    </div>
  )
}
