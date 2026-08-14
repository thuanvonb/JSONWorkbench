import { useMemo, useState } from 'react'

import { ColumnPopover } from './components/ColumnPopover'
import { ColumnsPanel } from './components/ColumnsPanel'
import { DataTable } from './components/DataTable'
import { EmptyState } from './components/EmptyState'
import { FilterPanel } from './components/FilterPanel'
import { GrainBar } from './components/GrainBar'
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
  columnFromDraft,
  createCompoundFilter,
  createCustomFilter,
  createPathColumn,
  createSimpleFilter,
  inferColumns,
} from './lib/factories'
import { buildFilterPlan } from './lib/filterTree'
import {
  DEFAULT_JOIN_SEP,
  columnGrain,
  columnGrains,
  expandRows,
  grainPaths,
  nextGrainKey,
  rootRef,
} from './lib/grain'
import { createId } from './lib/id'
import { describeInspect } from './lib/inspect'
import { currentSetupLabel, grainChipLabel, rowCountLabel, workspaceSummary } from './lib/labels'
import { DEFAULT_PANEL_WIDTH } from './lib/panelSize'
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
import type { ArrayMode, Filter, FilterType, Inspect, Row, RowRef } from './types/workbench'
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
  // Held here rather than in the panel, so a dragged width survives closing it.
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [schemaView, setSchemaView] = useState<SchemaViewState>({ open: {}, optionalOnly: false })
  const [popover, setPopover] = useState<PopoverState | null>(null)
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null)

  // Every table row, before filtering: one per record, or one per array entry
  // once the view's grain expands something.
  const expanded = useMemo(
    () => (workspace && view ? expandRows(workspace.rows, view) : []),
    [workspace, view],
  )
  const visible = useMemo(
    () => (view ? selectRows(expanded, view, search) : []),
    [expanded, view, search],
  )
  const shown = useMemo(() => visible.slice(0, display.maxRows), [visible, display.maxRows])
  const aggregates = useMemo(() => (view ? computeAggregates(view, visible) : []), [view, visible])
  const paths = useMemo(() => (workspace ? collectPaths(workspace.rows) : []), [workspace])
  const filterPlan = useMemo(() => buildFilterPlan(view?.filters ?? []), [view])
  const inspectDetail = useMemo(
    () => (workspace && view ? describeInspect(inspect, visible, workspace.rows, view.columns) : null),
    [inspect, visible, workspace, view],
  )
  const grains = useMemo(
    () => (workspace && view ? columnGrains(workspace.rows, view) : new Map()),
    [workspace, view],
  )
  const grainPathList = useMemo(() => grainPaths(view?.grain ?? []), [view])
  const nextGrain = useMemo(
    () => (workspace && view ? nextGrainKey(workspace.rows, view) : null),
    [workspace, view],
  )
  // The draft is not a column yet, so its array handling is worked out on its own.
  const draftGrain = useMemo(
    () =>
      workspace && view && popover?.kind === 'column' && popover.draft.kind === 'path'
        ? columnGrain(workspace.rows, view, popover.draft)
        : null,
    [workspace, view, popover],
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
      arrayMode: col.arrayMode ?? null,
      arrayIndex: col.arrayIndex,
      joinSep: col.joinSep,
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

  /**
   * Array handling lands at once rather than on Apply: expanding an array
   * changes every row of the table, so the choice has to be visible while it is
   * being made.
   */
  const patchColumnArray = (patch: Partial<ColumnDraft>) => {
    if (popover?.kind !== 'column') return
    const draft = { ...popover.draft, ...patch }
    setPopover({ ...popover, draft })
    if (!draft.isNew) dispatch({ type: 'column/update', column: columnFromDraft(draft) })
  }

  const pickArrayMode = (mode: ArrayMode) => {
    if (popover?.kind !== 'column' || !draftGrain) return
    const draft = popover.draft
    const patch: Partial<ColumnDraft> = { arrayMode: mode }
    if (mode === 'index' && draft.arrayIndex === undefined) patch.arrayIndex = 0
    if (mode === 'join' && draft.joinSep === undefined) patch.joinSep = DEFAULT_JOIN_SEP
    patchColumnArray(patch)

    if (mode === 'expand') {
      if (draftGrain.array) {
        dispatch({ type: 'grain/expand', path: draftGrain.array.abs, level: draftGrain.array.level })
      }
    } else if (!draftGrain.array && draftGrain.level > 0) {
      // Nothing left to resolve per column: the column only reads inside a level
      // the grain expanded, so stepping off `expand` means dropping that level.
      dispatch({ type: 'grain/trim', level: draftGrain.level - 1 })
    }
  }

  const applyColumn = () => {
    if (popover?.kind !== 'column') return
    const column = columnFromDraft(popover.draft)
    if (popover.draft.isNew) dispatch({ type: 'column/add', column })
    else dispatch({ type: 'column/update', column })
    setPopover(null)
  }

  const removeColumn = () => {
    if (popover?.kind === 'column' && !popover.draft.isNew) {
      dispatch({ type: 'column/remove', id: popover.draft.id })
    }
    setPopover(null)
  }

  const addNextGrain = () => {
    if (!nextGrain) return
    const prefix = grainPathList[grainPathList.length - 1] ?? ''
    const path = prefix ? `${prefix}.${nextGrain}` : nextGrain
    dispatch({ type: 'grain/expand', path, level: view.grain.length })
  }

  /** Schema tab: one click puts a path on the table as a column. */
  const addPathColumn = (path: string, key: string) =>
    dispatch({ type: 'column/add', column: createPathColumn(path, key) })

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

  const toggleRowInspect = (ref: RowRef) => {
    const same = inspect?.kind === 'row' && inspect.key === ref.key && panel === 'record'
    openPanel(inspectTab)
    setInspect(same ? null : { kind: 'row', key: ref.key, i: ref.i })
  }

  const toggleCellInspect = (ref: RowRef, colId: string) => {
    const same =
      inspect?.kind === 'cell' &&
      inspect.key === ref.key &&
      inspect.colId === colId &&
      panel === 'record'
    openPanel(inspectTab)
    setInspect(same ? null : { kind: 'cell', key: ref.key, i: ref.i, colId })
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

  const draftArray =
    draftGrain && (draftGrain.array || draftGrain.level > 0)
      ? {
          label: grainChipLabel(draftGrain.array?.abs ?? grainPathList[draftGrain.level - 1] ?? ''),
          mode: draftGrain.mode,
        }
      : null

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
          {view.grain.length ? (
            <GrainBar
              paths={grainPathList}
              keepEmpty={view.keepEmpty}
              nextKey={nextGrain}
              recordCount={workspace.rows.length}
              rowCount={expanded.length}
              onTrim={(level) => dispatch({ type: 'grain/trim', level })}
              onAddNext={addNextGrain}
              onToggleKeepEmpty={() => dispatch({ type: 'grain/keepEmpty' })}
            />
          ) : null}
          <div className={styles.scroll}>
            {hasRows ? (
              <DataTable
                columns={view.columns}
                rows={shown}
                sort={view.sort}
                display={display}
                inspect={inspect}
                grains={grains}
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
        </div>
        {panel ? (
          <SidePanel
            tab={panel}
            badges={{ columns: view.columns.length, filter: view.filters.length }}
            width={panelWidth}
            onWidth={setPanelWidth}
            onTab={openPanel}
            onClose={closePanel}
          >
            {panel === 'record' ? <InspectorPanel detail={inspectDetail} /> : null}
            {panel === 'schema' ? (
              <SchemaPanel
                rows={workspace.rows}
                columns={view.columns}
                state={schemaView}
                onChange={patchSchemaView}
                onAddColumn={addPathColumn}
              />
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
        count={rowCountLabel(
          visible.length,
          expanded.length,
          display.maxRows,
          view.grain.length ? workspace.rows.length : null,
        )}
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
          sampleRef={visible[0] ?? (workspace.rows.length ? rootRef(workspace.rows[0], 0) : null)}
          array={draftArray}
          onChange={patchColumnDraft}
          onPickArrayMode={pickArrayMode}
          onEntryIndex={(index) => patchColumnArray({ arrayIndex: index, arrayMode: 'index' })}
          onJoinSep={(separator) => patchColumnArray({ joinSep: separator, arrayMode: 'join' })}
          onApply={applyColumn}
          onRemove={removeColumn}
          onClose={() => setPopover(null)}
        />
      ) : null}
    </div>
  )
}
