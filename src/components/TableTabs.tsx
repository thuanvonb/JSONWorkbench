import { cx } from '../lib/cx'
import { isolate } from '../lib/events'
import type { RenameController } from '../types/ui'
import type { TableView } from '../types/workbench'
import { RenameInput } from './RenameInput'
import styles from './TableTabs.module.css'

interface TableTabsProps {
  views: TableView[]
  activeId: string
  rename: RenameController
  onSelect: (id: string) => void
  onDuplicate: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
}

/** Tables are alternate column/filter/sort setups over the same records. */
export function TableTabs({
  views,
  activeId,
  rename,
  onSelect,
  onDuplicate,
  onClose,
  onAdd,
}: TableTabsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.legend}>tables</div>
      {views.map((view) => {
        const active = view.id === activeId
        const renaming = rename.target?.id === view.id
        const meta = `${view.columns.length}c${view.filters.length ? ` · ${view.filters.length}f` : ''}`
        return (
          <div
            key={view.id}
            className={cx(styles.tab, active && styles.tabActive)}
            role="tab"
            tabIndex={0}
            aria-selected={active}
            title="Double-click to rename"
            onClick={() => onSelect(view.id)}
            onDoubleClick={() => rename.start(view.id, view.name)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(view.id)
              if (event.key === 'F2') rename.start(view.id, view.name)
            }}
          >
            {renaming ? (
              <RenameInput
                value={rename.target?.draft ?? ''}
                width={100}
                fontSize={11.5}
                onChange={rename.change}
                onCommit={rename.commit}
                onCancel={rename.cancel}
              />
            ) : (
              <span>{view.name}</span>
            )}
            <span className={styles.meta}>{meta}</span>
            <button
              type="button"
              className={cx(styles.action, styles.duplicate)}
              title="Duplicate table"
              aria-label={`Duplicate ${view.name}`}
              onClick={isolate(() => onDuplicate(view.id))}
            >
              ⧉
            </button>
            <button
              type="button"
              className={cx(styles.action, styles.close)}
              title="Delete table"
              aria-label={`Delete ${view.name}`}
              onClick={isolate(() => onClose(view.id))}
            >
              ×
            </button>
          </div>
        )
      })}
      <button type="button" className={styles.add} title="New table on this data" aria-label="New table" onClick={onAdd}>
        +
      </button>
    </div>
  )
}
