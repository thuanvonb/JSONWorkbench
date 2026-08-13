import type { ReactNode } from 'react'

import { cx } from '../lib/cx'
import type { PanelTab } from '../types/ui'
import styles from './SidePanel.module.css'

const TABS: Array<{ id: PanelTab; label: string }> = [
  { id: 'record', label: 'Record' },
  { id: 'schema', label: 'Schema' },
  { id: 'columns', label: 'Columns' },
  { id: 'filter', label: 'Filter' },
]

interface SidePanelProps {
  tab: PanelTab
  /** Counts shown next to a tab name; zero or missing shows nothing. */
  badges?: Partial<Record<PanelTab, number>>
  onTab: (tab: PanelTab) => void
  onClose: () => void
  children: ReactNode
}

/** Right-hand panel shell: the tab strip, and whichever tab is showing. */
export function SidePanel({ tab, badges, onTab, onClose, children }: SidePanelProps) {
  return (
    <aside className={styles.panel} aria-label="Inspector">
      <div className={styles.tabs} role="tablist" aria-label="Panel tabs">
        {TABS.map(({ id, label }) => {
          const count = badges?.[id]
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={cx(styles.tab, tab === id && styles.tabActive)}
              onClick={() => onTab(id)}
            >
              <span>{label}</span>
              {count ? <span className={styles.badge}>{count}</span> : null}
            </button>
          )
        })}
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
