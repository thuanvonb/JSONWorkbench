import { useRef } from 'react'
import type { KeyboardEvent } from 'react'

import styles from './RenameInput.module.css'

interface RenameInputProps {
  value: string
  width: number
  fontSize: number
  onChange: (value: string) => void
  onCommit: () => void
  onCancel: () => void
}

/** Inline tab-title editor: Enter or blur commits, Escape reverts. */
export function RenameInput({ value, width, fontSize, onChange, onCommit, onCancel }: RenameInputProps) {
  const cancelled = useRef(false)

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.currentTarget.blur()
      return
    }
    if (event.key === 'Escape') {
      event.stopPropagation()
      cancelled.current = true
      onCancel()
    }
  }

  return (
    <input
      className={styles.input}
      style={{ width, fontSize }}
      value={value}
      autoFocus
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        if (!cancelled.current) onCommit()
      }}
      onKeyDown={onKeyDown}
      aria-label="Rename"
    />
  )
}
