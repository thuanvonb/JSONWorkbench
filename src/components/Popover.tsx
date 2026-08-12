import type { ReactNode } from 'react'

import { useEscapeKey } from '../hooks/useEscapeKey'
import { stopPropagation } from '../lib/events'
import styles from './Popover.module.css'

interface PopoverProps {
  x: number
  y: number
  width: number
  label: string
  onClose: () => void
  children: ReactNode
}

/** Floating panel anchored to a toolbar button or column header. */
export function Popover({ x, y, width, label, onClose, children }: PopoverProps) {
  useEscapeKey(onClose)

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.panel}
        style={{ left: x, top: y, width }}
        role="dialog"
        aria-label={label}
        onClick={stopPropagation}
      >
        {children}
      </div>
    </div>
  )
}
