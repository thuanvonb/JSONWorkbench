import type { MouseEvent } from 'react'

import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  actionLabel: string
  onAction: (event: MouseEvent<HTMLButtonElement>) => void
  /** Offered when the records are loaded but no columns have been picked yet. */
  onInfer?: () => void
}

export function EmptyState({ title, actionLabel, onAction, onInfer }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <div className={styles.actions}>
        <button type="button" className={styles.action} onClick={onAction}>
          {actionLabel}
        </button>
        {onInfer ? (
          <button type="button" className={styles.secondary} onClick={onInfer}>
            Infer table
          </button>
        ) : null}
      </div>
    </div>
  )
}
