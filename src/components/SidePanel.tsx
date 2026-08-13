import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import type { PanelTab } from '../types/ui'
import styles from './SidePanel.module.css'

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: 'record', label: 'Record' },
  { id: 'schema', label: 'Schema' },
]

interface SidePanelProps {
  tab: PanelTab
  onTab: (tab: PanelTab) => void
  onClose: () => void
  children: ReactNode
}

/** Right-hand panel shell: the tab strip, and whichever tab is showing. */
export function SidePanel({ tab, onTab, onClose, children }: SidePanelProps) {
  return (
    <aside className={styles.panel} aria-label="Inspector">
      <div className={styles.tabs} role="tablist" aria-label="Panel tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={cx(styles.tab, tab === id && styles.tabActive)}
            onClick={() => onTab(id)}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          className={`wb-icon-btn ${styles.close}`}
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
      </div>
      {children}
    </aside>
  )
}
