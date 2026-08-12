import type { ReactNode } from 'react'

import { useEscapeKey } from '../hooks/useEscapeKey'
import { stopPropagation } from '../lib/events'
import styles from './Modal.module.css'

interface ModalProps {
  title: string
  subtitle?: string
  /** Maximum card width in pixels; the card shrinks on narrow viewports. */
  width: number
  onClose: () => void
  children: ReactNode
  footer?: ReactNode
}

export function Modal({ title, subtitle, width, onClose, children, footer }: ModalProps) {
  useEscapeKey(onClose)

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.card}
        style={{ width: `min(${width}px, 100%)` }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={stopPropagation}
      >
        <div className={styles.header}>
          <span className={styles.title}>{title}</span>
          {subtitle ? <span className={styles.subtitle}>{subtitle}</span> : null}
          <button type="button" className={`wb-icon-btn ${styles.close}`} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer ? <div className={styles.footer}>{footer}</div> : null}
      </div>
    </div>
  )
}
