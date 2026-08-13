import { useMemo, useState } from 'react'

import { ColumnPopover } from './components/ColumnPopover'
import { ColumnsPanel } from './components/ColumnsPanel'
import { DataTable } from './components/DataTable'
import { EmptyState } from './components/EmptyState'
import { FilterPanel } from './components/FilterPanel'
import { InspectorPanel } from './components/InspectorPanel'
import { ProfilesModal } from './components/ProfilesModal'
import { SchemaPanel } from './components/SchemaPanel'
import { SidePanel } from './components/SidePanel'
import { SourceModal } from './components/SourceModal'
import { StatusBar } from './components/StatusBar'
import { TableTabs } from './components/TableTabs'
import { Toolbar } from './components/Toolbar'
import { WorkspaceTabs } from './components/WorkspaceTabs'
import { csvFileName, toCsv } from './lib/csv'
import { demoRows } from './lib/demoData'
import { downloadText } from './lib/download'
import {
  createCompoundFilter,
  createCustomFilter,
  createSimpleFilter,
  inferColumns,
} from './lib/factories'
import { buildFilterPlan } from './lib/filterTree'
import { createId } from './lib/id'
import { describeInspect } from './lib/inspect'
import { currentSetupLabel, rowCountLabel, workspaceSummary } from './lib/labels'
import { parseRecords, sameShape } from './lib/parse'
import type { Profile } from './lib/profiles'
import { profileViews, shapeKey } from './lib/profiles'
import { collectPaths } from './lib/path'
import { COLUMN_POPOVER_SIZE, anchorPopover } from './lib/popover'
import { computeAggregates, selectRows } from './lib/rows'
import { useProfiles } from './state/useProfiles'
import { useWorkbench } from './state/useWorkbench'
import type {
  ColumnDraft,
  PanelTab,
  PopoverState,
  RenameController,
  RenameTarget,
  SchemaViewState,
} from './types/ui'
import type { Column, Filter, FilterType, Inspect, Row } from './types/workbench'
import styles from './App.module.css'

const FOOTER_HINT = 'click a cell for its raw value · click # for the whole record'

export default function App() {
  const { workspaces, workspace, view, display, setDisplay, dispatch } = useWorkbench()
  const profiles = useProfiles()

  const [search, setSearch] = useState('')
  const [sourceOpen, setSourceOpen] = useState(false)
  const [profilesOpen, setProfilesOpen] = useState(false)
  const [parseError, setParseError] = useState('')
  const [inspect, setInspect] = useState<Inspect | null>(null)
  const [panel, setPanel] = useState<PanelTab | null>(null)
  // Which tab the Panel button reopens on.
  const [lastPanel, setLastPanel] = useState<PanelTab>('schema')
  const [schemaView, setSchemaView] = useState<SchemaViewState>({ open: {}, optionalOnly: false })
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)

  const visible = useMemo(
    () => (workspace && view ? selectRows(workspace, view, search) : []),
    [workspace, view, search],
  )
  const shown = useMemo(() => visible.slice(0, display.maxRows), [visible, display.maxRows])
  const aggregates = useMemo(() => (view ? computeAggregates(view, visible) : []), [view, visible])
  const paths = useMemo(() => (workspace ? collectPaths(workspace.rows) : []), [workspace])
  const filterPlan = useMemo(() => buildFilterPlan(view?.filters ?? []), [view])
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

  const inferTable = () => {
    const columns = inferColumns(workspace.rows)
    if (columns.length) dispatch({ type: 'columns/replace', columns })
  }

  const addFilter = (type: FilterType) => {
    const filter =
      type === 'simple'
        ? createSimpleFilter(view.columns[0]?.id ?? '')
        : type === 'custom'
          ? createCustomFilter()
          : createCompoundFilter(view.filters)
    dispatch({ type: 'filter/add', filter })
  }

  const patchFilter = <F extends Filter>(filter: F, patch: Partial<F>) =>
    dispatch({ type: 'filter/update', filter: { ...filter, ...patch } })

  const openPanel = (tab: PanelTab) => {
    setPanel(tab)
    setLastPanel(tab)
  }

  const togglePanel = () => {
    if (panel) setPanel(null)
    else openPanel(lastPanel)
  }

  // Selecting a value brings the Record tab forward, unless the panel is parked
  // on Schema or Columns — those stay put while cells are clicked. Clicking the
  // same value again clears it, leaving the Record tab open on its hint.
  const inspectTab: PanelTab = panel === 'schema' || panel === 'columns' ? panel : 'record'

  const toggleRowInspect = (index: number) => {
    const same = inspect?.kind === 'row' && inspect.i === index && panel === 'record'
    openPanel(inspectTab)
    setInspect(same ? null : { kind: 'row', i: index })
  }

  const toggleCellInspect = (index: number, colId: string) => {
    const same =
      inspect?.kind === 'cell' && inspect.i === index && inspect.colId === colId && panel === 'record'
    openPanel(inspectTab)
    setInspect(same ? null : { kind: 'cell', i: index, colId })
  }

  const closePanel = () => {
    setPanel(null)
    setInspect(null)
  }

  const patchSchemaView = (patch: Partial<SchemaViewState>) =>
    setSchemaView((current) => ({ ...current, ...patch }))

  const loadProfile = (profile: Profile) => {
    dispatch({ type: 'views/replace', views: profileViews(profile) })
    setProfilesOpen(false)
    closePanel()
  }

  return (
    <div className={styles.app}>
      <WorkspaceTabs
        workspaces={workspaces}
        activeId={workspace.id}
        rename={rename}
        profileCount={profiles.profiles.length}
        onSelect={selectWorkspace}
        onClose={closeWorkspace}
        onAdd={addWorkspace}
        onOpenProfiles={() => setProfilesOpen(true)}
      />

      <Toolbar
        summary={workspaceSummary(workspace.rows.length, view.columns.length, paths.length)}
        filterCount={view.filters.length}
        appliedCount={filterPlan.roots.length}
        panelOpen={panel !== null}
        search={search}
        onToggleSource={() => setSourceOpen((open) => !open)}
        onOpenFilter={() => openPanel('filter')}
        onAddColumn={openAddColumn}
        onSearchChange={setSearch}
        onExportCsv={exportCsv}
        onTogglePanel={togglePanel}
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
              onInfer={workspace.rows.length ? inferTable : undefined}
            />
          )}
        </div>
        {panel ? (
          <SidePanel
            tab={panel}
            badges={{ columns: view.columns.length, filter: view.filters.length }}
            onTab={openPanel}
            onClose={closePanel}
          >
            {panel === 'record' ? <InspectorPanel detail={inspectDetail} /> : null}
            {panel === 'schema' ? (
              <SchemaPanel rows={workspace.rows} state={schemaView} onChange={patchSchemaView} />
            ) : null}
            {panel === 'columns' ? (
              <ColumnsPanel
                columns={view.columns}
                display={display}
                onAddColumn={openAddColumn}
                onEditColumn={openEditColumn}
                onMove={(index, dir) => dispatch({ type: 'column/move', index, dir })}
                onDisplayChange={setDisplay}
              />
            ) : null}
            {panel === 'filter' ? (
              <FilterPanel
                filters={view.filters}
                columns={view.columns}
                plan={filterPlan}
                onAdd={addFilter}
                onPatch={patchFilter}
                onRemove={(id) => dispatch({ type: 'filter/remove', id })}
              />
            ) : null}
          </SidePanel>
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

      {profilesOpen ? (
        <ProfilesModal
          profiles={profiles.profiles}
          defaultName={workspace.name}
          shape={shapeKey(workspace.rows)}
          setup={currentSetupLabel(workspace, view)}
          onSave={(name) => profiles.save(name, workspace)}
          onUpdate={(id) => profiles.update(id, workspace)}
          onDelete={profiles.remove}
          onLoad={loadProfile}
          onClose={() => setProfilesOpen(false)}
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
    </div>
  )
}
