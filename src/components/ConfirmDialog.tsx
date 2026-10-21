import { useEscapeKey } from '../hooks/useEscapeKey'
import { stopPropagation } from '../lib/events'
import styles from './ConfirmDialog.module.css'

interface ConfirmDialogProps {
  title: string
  body: string
  /** The primary button: the action that throws the user's setup away. */
  confirmLabel: string
  onConfirm: () => void
  /** An optional middle button: a way to go ahead and keep the setup as well. */
  alternateLabel?: string
  onAlternate?: () => void
  onCancel: () => void
}

/** Asked before an action throws away columns and filters the user built. */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  alternateLabel,
  onAlternate,
  onCancel,
}: ConfirmDialogProps) {
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
          {alternateLabel && onAlternate ? (
            <button type="button" className="wb-btn" onClick={onAlternate}>
              {alternateLabel}
            </button>
          ) : null}
          <button type="button" className="wb-btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
