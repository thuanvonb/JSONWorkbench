import type { MouseEvent } from 'react'

import styles from './EmptyState.module.css'

interface EmptyStateProps {
  title: string
  actionLabel: string
  onAction: (event: MouseEvent<HTMLButtonElement>) => void
}

export function EmptyState({ title, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{title}</div>
      <button type="button" className={styles.action} onClick={onAction}>
        {actionLabel}
      </button>
    </div>
  )
}
