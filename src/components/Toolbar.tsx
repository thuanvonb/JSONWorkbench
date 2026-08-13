import type { MouseEvent } from 'react'

import { filterLabel } from '../lib/filters'
import type { Column, Filter } from '../types/workbench'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  summary: string
  columns: Column[]
  filters: Filter[]
  search: string
  onToggleSource: () => void
  onRemoveFilter: (id: string) => void
  onOpenFilterMenu: (anchor: DOMRect) => void
  onOpenSchema: () => void
  onOpenOrganize: () => void
  onAddColumn: (anchor: DOMRect) => void
  onSearchChange: (value: string) => void
  onExportCsv: () => void
}

export function Toolbar({
  summary,
  columns,
  filters,
  search,
  onToggleSource,
  onRemoveFilter,
  onOpenFilterMenu,
  onOpenSchema,
  onOpenOrganize,
  onAddColumn,
  onSearchChange,
  onExportCsv,
}: ToolbarProps) {
  const anchorOf = (event: MouseEvent<HTMLButtonElement>) => event.currentTarget.getBoundingClientRect()

  return (
    <div className={styles.bar}>
      <button type="button" className={styles.summary} onClick={onToggleSource} title="Edit source JSON">
        <span className={styles.caret}>✎</span>
        <span className={styles.summaryText}>{summary}</span>
      </button>
      <div className={styles.divider} />
      <div className={styles.filters}>
        {filters.map((filter) => (
          <div key={filter.id} className={styles.pill}>
            <span className={styles.pillLabel}>{filterLabel(filter, columns)}</span>
            <button
              type="button"
              className={styles.pillRemove}
              aria-label="Remove filter"
              onClick={() => onRemoveFilter(filter.id)}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" className={styles.addFilter} onClick={(event) => onOpenFilterMenu(anchorOf(event))}>
          + filter
        </button>
      </div>
      <button
        type="button"
        className={`wb-btn wb-btn-sm ${styles.action}`}
        title="Schema inferred from the input"
        onClick={onOpenSchema}
      >
        Schema
      </button>
      <button type="button" className={`wb-btn wb-btn-sm ${styles.action}`} onClick={onOpenOrganize}>
        Organize
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
    </div>
  )
}
