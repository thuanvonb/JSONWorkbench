import { useMemo, useState } from 'react'

import { ColumnPopover } from './components/ColumnPopover'
import { DataTable } from './components/DataTable'
import { EmptyState } from './components/EmptyState'
import { FilterPopover } from './components/FilterPopover'
import { InspectorPanel } from './components/InspectorPanel'
import { OrganizeModal } from './components/OrganizeModal'
import { SourceModal } from './components/SourceModal'
import { StatusBar } from './components/StatusBar'
import { TableTabs } from './components/TableTabs'
import { Toolbar } from './components/Toolbar'
import { WorkspaceTabs } from './components/WorkspaceTabs'
import { csvFileName, toCsv } from './lib/csv'
import { demoRows } from './lib/demoData'
import { downloadText } from './lib/download'
import { createId } from './lib/id'
import { describeInspect } from './lib/inspect'
import { rowCountLabel, workspaceSummary } from './lib/labels'
import { parseRecords, sameShape } from './lib/parse'
import { collectPaths } from './lib/path'
import {
  COLUMN_POPOVER_SIZE,
  FILTER_POPOVER_SIZE,
  anchorLeftAligned,
  anchorPopover,
} from './lib/popover'
import { computeAggregates, selectRows } from './lib/rows'
import { useWorkbench } from './state/useWorkbench'
import type { ColumnDraft, FilterDraft, PopoverState, RenameController, RenameTarget } from './types/ui'
import { JS_FILTER_OPTION } from './types/ui'
import type { Column, Inspect, Row } from './types/workbench'
import styles from './App.module.css'

const FOOTER_HINT = 'click a cell for its raw value · click # for the whole record'

export default function App() {
  const { workspaces, workspace, view, display, setDisplay, dispatch } = useWorkbench()

  const [search, setSearch] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [organizeOpen, setOrganizeOpen] = useState(false)
  const [parseError, setParseError] = useState('')
  const [inspect, setInspect] = useState<Inspect | null>(null)
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)

  const visible = useMemo(
    () => (workspace && view ? selectRows(workspace, view, search) : []),
    [workspace, view, search],
  )
  const shown = useMemo(() => visible.slice(0, display.maxRows), [visible, display.maxRows])
  const aggregates = useMemo(() => (view ? computeAggregates(view, visible) : []), [view, visible])
  const paths = useMemo(() => (workspace ? collectPaths(workspace.rows) : []), [workspace])
  const inspectDetail = useMemo(
    () => (workspace && view ? describeInspect(inspect, workspace.rows, view.columns) : null),
    [inspect, workspace, view],
  )

  // useWorkbench always keeps one workspace holding one table; this only guards
  // the types.
  if (!workspace || !view) return null

  const hasRows = workspace.rows.length > 0 && view.columns.length > 0

  const rename: RenameController = {
    target: renameTarget,
    start: (id, currentName) => setRenameTarget({ id, draft: currentName }),
    change: (draft) => setRenameTarget((current) => (current ? { ...current, draft } : current)),
    commit: () => {
      const name = renameTarget?.draft.trim()
      if (renameTarget && name) dispatch({ type: 'rename', id: renameTarget.id, name })
      setRenameTarget(null)
    },
    cancel: () => setRenameTarget(null),
  }

  const loadRecords = (raw: string, rows: Row[], keepViews: boolean) => {
    dispatch({ type: 'data/load', raw, rows, keepViews })
    setParseError('')
    setSourceOpen(false)
    setInspect(null)
  }

  const parseSource = (text: string) => {
    const result = parseRecords(text)
    if (!result.ok) {
      setParseError(result.error)
      return
    }
    // Reusing the existing tables only makes sense when the records still look
    // the same; otherwise the columns would all resolve to nothing.
    const keepViews = workspace.rows.length > 0 && sameShape(workspace.rows[0], result.rows[0])
    loadRecords(text.trim(), result.rows, keepViews)
  }

  const loadSample = () => {
    const rows = demoRows()
    loadRecords(JSON.stringify(rows, null, 2), rows, false)
  }

  const exportCsv = () => {
    downloadText(csvFileName(workspace.name, view.name), 'text/csv', toCsv(view.columns, visible))
  }

  const selectWorkspace = (id: string) => {
    dispatch({ type: 'workspace/select', id })
    setInspect(null)
    setSearch('')
    setSourceOpen(false)
  }

  const closeWorkspace = (id: string) => {
    const wasLast = workspaces.length === 1
    dispatch({ type: 'workspace/close', id })
    setInspect(null)
    setSearch('')
    if (wasLast) setSourceOpen(true)
  }

  const addWorkspace = () => {
    dispatch({ type: 'workspace/add' })
    setInspect(null)
    setSearch('')
  }

  const openAddColumn = (anchor: DOMRect) => {
    const draft: ColumnDraft = { id: createId(), name: '', kind: 'path', path: '', code: '', isNew: true }
    setPopover({
      kind: 'column',
      ...anchorPopover(anchor, COLUMN_POPOVER_SIZE.width, COLUMN_POPOVER_SIZE.height),
      draft,
    })
  }

  const openEditColumn = (colId: string, anchor: DOMRect) => {
    const col = view.columns.find((c) => c.id === colId)
    if (!col) return
    const draft: ColumnDraft = {
      id: col.id,
      name: col.name,
      kind: col.kind,
      path: col.path ?? '',
      code: col.code ?? '',
      isNew: false,
    }
    setPopover({
      kind: 'column',
      ...anchorPopover(anchor, COLUMN_POPOVER_SIZE.width, COLUMN_POPOVER_SIZE.height),
      draft,
    })
  }

  const patchColumnDraft = (patch: Partial<ColumnDraft>) =>
    setPopover((current) =>
      current?.kind === 'column' ? { ...current, draft: { ...current.draft, ...patch } } : current,
    )

  const applyColumn = () => {
    if (popover?.kind !== 'column') return
    const draft = popover.draft
    const column: Column = {
      id: draft.id,
      name: draft.name || draft.path || 'column',
      kind: draft.kind,
      path: draft.path,
      code: draft.code,
    }
    if (draft.isNew) dispatch({ type: 'column/add', column })
    else dispatch({ type: 'column/update', column })
    setPopover(null)
  }

  const removeColumn = () => {
    if (popover?.kind === 'column' && !popover.draft.isNew) {
      dispatch({ type: 'column/remove', id: popover.draft.id })
    }
    setPopover(null)
  }

  const openFilterMenu = (anchor: DOMRect) => {
    const draft: FilterDraft = {
      colId: view.columns[0]?.id ?? JS_FILTER_OPTION,
      op: 'contains',
      value: '',
      code: '',
    }
    setPopover({
      kind: 'filter',
      ...anchorLeftAligned(anchor, FILTER_POPOVER_SIZE.width, FILTER_POPOVER_SIZE.height),
      draft,
    })
  }

  const patchFilterDraft = (patch: Partial<FilterDraft>) =>
    setPopover((current) =>
      current?.kind === 'filter' ? { ...current, draft: { ...current.draft, ...patch } } : current,
    )

  const applyFilter = () => {
    if (popover?.kind !== 'filter') return
    const draft = popover.draft
    if (draft.colId === JS_FILTER_OPTION) {
      if (draft.code.trim()) {
        dispatch({ type: 'filter/add', filter: { id: createId(), kind: 'js', code: draft.code } })
      }
    } else {
      dispatch({
        type: 'filter/add',
        filter: { id: createId(), kind: 'col', colId: draft.colId, op: draft.op, value: draft.value },
      })
    }
    setPopover(null)
  }

  const toggleRowInspect = (index: number) =>
    setInspect((current) => (current?.kind === 'row' && current.i === index ? null : { kind: 'row', i: index }))

  const toggleCellInspect = (index: number, colId: string) =>
    setInspect((current) =>
      current?.kind === 'cell' && current.i === index && current.colId === colId
        ? null
        : { kind: 'cell', i: index, colId },
    )

  return (
    <div className={styles.app}>
      <WorkspaceTabs
        workspaces={workspaces}
        activeId={workspace.id}
        rename={rename}
        onSelect={selectWorkspace}
        onClose={closeWorkspace}
        onAdd={addWorkspace}
      />

      <Toolbar
        summary={workspaceSummary(workspace.rows.length, view.columns.length, paths.length)}
        columns={view.columns}
        filters={view.filters}
        search={search}
        onToggleSource={() => setSourceOpen((open) => !open)}
        onRemoveFilter={(id) => dispatch({ type: 'filter/remove', id })}
        onOpenFilterMenu={openFilterMenu}
        onOpenOrganize={() => setOrganizeOpen(true)}
        onAddColumn={openAddColumn}
        onSearchChange={setSearch}
        onExportCsv={exportCsv}
      />

      <div className={styles.main}>
        <div className={styles.grid}>
          {hasRows ? (
            <DataTable
              columns={view.columns}
              rows={shown}
              sort={view.sort}
              display={display}
              inspect={inspect}
              onSort={(colId) => dispatch({ type: 'sort/toggle', colId })}
              onEditColumn={openEditColumn}
              onInspectRow={toggleRowInspect}
              onInspectCell={toggleCellInspect}
            />
          ) : (
            <EmptyState
              title={
                workspace.rows.length
                  ? 'This table has no columns yet.'
                  : 'No data set up in this workspace yet.'
              }
              actionLabel={workspace.rows.length ? 'Add a column' : 'Set up source JSON'}
              onAction={(event) => {
                if (workspace.rows.length) openAddColumn(event.currentTarget.getBoundingClientRect())
                else setSourceOpen(true)
              }}
            />
          )}
        </div>
        {inspectDetail ? (
          <InspectorPanel detail={inspectDetail} onClose={() => setInspect(null)} />
        ) : null}
      </div>

      <TableTabs
        views={workspace.views}
        activeId={view.id}
        rename={rename}
        onSelect={(id) => dispatch({ type: 'view/select', id })}
        onDuplicate={(id) => dispatch({ type: 'view/duplicate', id })}
        onClose={(id) => dispatch({ type: 'view/close', id })}
        onAdd={() => dispatch({ type: 'view/add' })}
      />

      <StatusBar
        count={rowCountLabel(visible.length, workspace.rows.length, display.maxRows)}
        aggregates={aggregates}
        hint={FOOTER_HINT}
      />

      {sourceOpen ? (
        <SourceModal
          workspaceName={workspace.name}
          raw={workspace.raw}
          error={parseError}
          onParse={parseSource}
          onLoadDemo={loadSample}
          onClose={() => {
            setSourceOpen(false)
            setParseError('')
          }}
        />
      ) : null}

      {organizeOpen ? (
        <OrganizeModal
          columns={view.columns}
          display={display}
          onMove={(index, dir) => dispatch({ type: 'column/move', index, dir })}
          onDisplayChange={setDisplay}
          onClose={() => setOrganizeOpen(false)}
        />
      ) : null}

      {popover?.kind === 'column' ? (
        <ColumnPopover
          x={popover.x}
          y={popover.y}
          draft={popover.draft}
          paths={paths}
          sampleRow={workspace.rows[0] ?? null}
          onChange={patchColumnDraft}
          onApply={applyColumn}
          onRemove={removeColumn}
          onClose={() => setPopover(null)}
        />
      ) : null}

      {popover?.kind === 'filter' ? (
        <FilterPopover
          x={popover.x}
          y={popover.y}
          draft={popover.draft}
          columns={view.columns}
          onChange={patchFilterDraft}
          onApply={applyFilter}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </div>
  )
}
