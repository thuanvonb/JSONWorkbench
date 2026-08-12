import { cx } from '../lib/cx'
import { isolate } from '../lib/events'
import type { RenameController } from '../types/ui'
import type { Workspace } from '../types/workbench'
import { RenameInput } from './RenameInput'
import styles from './WorkspaceTabs.module.css'

interface WorkspaceTabsProps {
  workspaces: Workspace[]
  activeId: string | null
  rename: RenameController
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
}

export function WorkspaceTabs({
  workspaces,
  activeId,
  rename,
  onSelect,
  onClose,
  onAdd,
}: WorkspaceTabsProps) {
  return (
    <div className={styles.bar}>
      <div className={styles.brand}>
        <div className={styles.mark} />
        <span className={styles.brandName}>JSON Workbench</span>
      </div>
      <div className={styles.tabs} role="tablist" aria-label="Workspaces">
        {workspaces.map((workspace) => {
          const active = workspace.id === activeId
          const renaming = rename.target?.id === workspace.id
          return (
            <div
              key={workspace.id}
              className={cx(styles.tab, active && styles.tabActive)}
              role="tab"
              tabIndex={0}
              aria-selected={active}
              title="Double-click to rename"
              onClick={() => onSelect(workspace.id)}
              onDoubleClick={() => rename.start(workspace.id, workspace.name)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') onSelect(workspace.id)
                if (event.key === 'F2') rename.start(workspace.id, workspace.name)
              }}
            >
              {renaming ? (
                <RenameInput
                  value={rename.target?.draft ?? ''}
                  width={110}
                  fontSize={12}
                  onChange={rename.change}
                  onCommit={rename.commit}
                  onCancel={rename.cancel}
                />
              ) : (
                <span>{workspace.name}</span>
              )}
              <span className={styles.count}>{workspace.rows.length || ''}</span>
              <button
                type="button"
                className={styles.close}
                title="Close workspace"
                aria-label={`Close ${workspace.name}`}
                onClick={isolate(() => onClose(workspace.id))}
              >
                ×
              </button>
            </div>
          )
        })}
        <button type="button" className={styles.add} title="New workspace" aria-label="New workspace" onClick={onAdd}>
          +
        </button>
      </div>
    </div>
  )
}
