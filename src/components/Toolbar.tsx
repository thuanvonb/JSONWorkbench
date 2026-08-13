import type { MouseEvent } from 'react'

import { cx } from '../lib/cx'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  summary: string
  /** Total filter rows, shown next to the Filter button. */
  filterCount: number
  /** How many of those rows actually narrow the table. */
  appliedCount: number
  panelOpen: boolean
  search: string
  onToggleSource: () => void
  onOpenFilter: () => void
  onAddColumn: (anchor: DOMRect) => void
  onSearchChange: (value: string) => void
  onExportCsv: () => void
  onTogglePanel: () => void
}

export function Toolbar({
  summary,
  filterCount,
  appliedCount,
  panelOpen,
  search,
  onToggleSource,
  onOpenFilter,
  onAddColumn,
  onSearchChange,
  onExportCsv,
  onTogglePanel,
}: ToolbarProps) {
  const anchorOf = (event: MouseEvent<HTMLButtonElement>) => event.currentTarget.getBoundingClientRect()

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.summary} onClick={onToggleSource} title="Edit source JSON">
        <span className={styles.caret}>✎</span>
        <span className={styles.summaryText}>{summary}</span>
      </button>
      <div className={styles.divider} />
      <div className={styles.spacer} />
      <button
        type="button"
        className={cx('wb-btn wb-btn-sm', styles.toggle, appliedCount > 0 && styles.toggleOn)}
        title="Filter rows"
        onClick={onOpenFilter}
      >
        <span>Filter</span>
        <span className={styles.badge}>{filterCount || ''}</span>
      </button>
      <button
        type="button"
        className={`wb-btn wb-btn-sm wb-btn-accent ${styles.action}`}
        onClick={(event) => onAddColumn(anchorOf(event))}
      >
        + Column
      </button>
      <input
        className={styles.search}
        value={search}
        placeholder="search all cells"
        aria-label="Search all cells"
        onChange={(event) => onSearchChange(event.target.value)}
      />
      <button type="button" className={`wb-btn wb-btn-sm ${styles.action}`} onClick={onExportCsv}>
        Export CSV
      </button>
      <button
        type="button"
        className={cx('wb-btn wb-btn-sm', styles.toggle, panelOpen && styles.toggleOn)}
        title="Record, schema and columns panel"
        aria-pressed={panelOpen}
        onClick={onTogglePanel}
      >
        <span className={styles.mark}>{panelOpen ? '◨' : '◧'}</span>
        <span>Panel</span>
      </button>
    </div>
  )
}
