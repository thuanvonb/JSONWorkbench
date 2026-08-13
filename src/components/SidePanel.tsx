import type { ReactNode } from 'react'

import { usePanelResize } from '../hooks/usePanelResize'
import { cx } from '../lib/cx'
import { DEFAULT_PANEL_WIDTH } from '../lib/panelSize'
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
  /** Current panel width in px; the grip reports drags back through onWidth. */
  width: number
  onWidth: (width: number) => void
  onTab: (tab: PanelTab) => void
  onClose: () => void
  children: ReactNode
}

const GRIP_HINT = 'Drag to resize · double-click to reset'

/** Right-hand panel shell: the resize grip, the tab strip, and whichever tab is showing. */
export function SidePanel({ tab, badges, width, onWidth, onTab, onClose, children }: SidePanelProps) {
  const resize = usePanelResize(width, onWidth)

  return (
    <aside className={styles.panel} style={{ width }} aria-label="Inspector">
      <div
        className={cx(styles.grip, resize.resizing && styles.gripActive)}
        role="separator"
        aria-orientation="vertical"
        title={GRIP_HINT}
        onMouseDown={resize.start}
        onDoubleClick={() => onWidth(DEFAULT_PANEL_WIDTH)}
      />
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
