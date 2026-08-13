import type { DisplaySettings, TableView, Workspace } from '../types/workbench'
import { DEFAULT_DISPLAY } from '../types/workbench'
import { createView } from './factories'
import { normalizeFilters } from './filters'
import { createId } from './id'
import type { Profile } from './profiles'

const STORAGE_KEY = 'json-workbench.v1'
/** Profiles are reusable across workspaces, so they live outside the document. */
const PROFILES_KEY = 'json-workbench.profiles.v1'

export interface PersistedState {
  activeId: string | null
  workspaces: Workspace[]
  display: DisplaySettings
}

export function loadPersistedState(): PersistedState | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? 'null')
  } catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object') return null

  const raw = parsed as Partial<PersistedState> & { workspaces?: unknown[] }
  if (!Array.isArray(raw.workspaces) || raw.workspaces.length === 0) return null

  const workspaces = raw.workspaces.map(migrateWorkspace)
  return {
    workspaces,
    activeId: typeof raw.activeId === 'string' ? raw.activeId : workspaces[0].id,
    display: { ...DEFAULT_DISPLAY, ...(raw.display ?? {}) },
  }
}

export function savePersistedState(state: PersistedState): void {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        activeId: state.activeId,
        display: state.display,
        workspaces: state.workspaces.map((w) => ({
          id: w.id,
          name: w.name,
          raw: w.raw,
          rows: w.rows,
          views: w.views,
          viewId: w.viewId,
        })),
      }),
    )
  } catch {
    // Storage full or unavailable (private mode): the session still works.
  }
}

export function loadProfiles(): Profile[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(PROFILES_KEY) ?? 'null')
    return Array.isArray(parsed) ? (parsed as Profile[]) : []
  } catch {
    return []
  }
}

export function saveProfiles(profiles: Profile[]): void {
  try {
    window.localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles))
  } catch {
    // Storage full or unavailable: the profiles just do not outlive the tab.
  }
}

/** Legacy workspaces kept columns/filters/sort at the top level, before tables existed. */
type LegacyWorkspace = Workspace & Partial<Pick<TableView, 'columns' | 'filters' | 'sort'>>

function migrateWorkspace(input: unknown): Workspace {
  const saved = (input ?? {}) as Partial<LegacyWorkspace>
  const workspace: Workspace = {
    id: saved.id ?? createId(),
    name: saved.name ?? 'Workspace',
    raw: saved.raw ?? '',
    rows: Array.isArray(saved.rows) ? saved.rows : [],
    views: Array.isArray(saved.views) ? saved.views.map(migrateView) : [],
    viewId: saved.viewId ?? '',
  }

  if (workspace.views.length === 0) {
    const view = createView('Table 1', saved.columns ?? [])
    view.filters = normalizeFilters(saved.filters)
    view.sort = saved.sort ?? null
    workspace.views = [view]
  }
  if (!workspace.views.some((v) => v.id === workspace.viewId)) {
    workspace.viewId = workspace.views[0].id
  }
  return workspace
}

/** Filter rows changed shape when the filter panel replaced the pills. */
function migrateView(input: unknown): TableView {
  const saved = (input ?? {}) as Partial<TableView>
  return {
    id: saved.id ?? createId(),
    name: saved.name ?? 'Table 1',
    columns: Array.isArray(saved.columns) ? saved.columns : [],
    filters: normalizeFilters(saved.filters),
    sort: saved.sort ?? null,
  }
}
