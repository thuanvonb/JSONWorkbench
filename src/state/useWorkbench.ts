import { useEffect, useMemo, useReducer, useState } from 'react'

import { createWorkspace } from '../lib/factories'
import { loadPersistedState, savePersistedState } from '../lib/storage'
import type { DisplaySettings, TableView, Workspace } from '../types/workbench'
import { DEFAULT_DISPLAY } from '../types/workbench'
import type { WorkbenchAction, WorkbenchState } from './workbenchReducer'
import { workbenchReducer } from './workbenchReducer'

const SAVE_DEBOUNCE_MS = 400

interface Restored {
  workbench: WorkbenchState
  display: DisplaySettings
}

function restore(): Restored {
  const saved = loadPersistedState()
  if (saved) {
    return {
      workbench: { workspaces: saved.workspaces, activeId: saved.activeId },
      display: saved.display,
    }
  }
  const workspace = createWorkspace('Workspace 1')
  return { workbench: { workspaces: [workspace], activeId: workspace.id }, display: DEFAULT_DISPLAY }
}

export interface Workbench extends WorkbenchState {
  /** The selected workspace, or null before anything exists. */
  workspace: Workspace | null
  /** The selected table of the selected workspace. */
  view: TableView | null
  display: DisplaySettings
  setDisplay: (patch: Partial<DisplaySettings>) => void
  dispatch: (action: WorkbenchAction) => void
}

/** Owns the persisted document state and mirrors it to localStorage. */
export function useWorkbench(): Workbench {
  const [restored] = useState(restore)
  const [state, dispatch] = useReducer(workbenchReducer, restored.workbench)
  const [display, setDisplayState] = useState<DisplaySettings>(restored.display)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      savePersistedState({ activeId: state.activeId, workspaces: state.workspaces, display })
    }, SAVE_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [state, display])

  // Falls back to the first workspace so a stale activeId cannot blank the app.
  const workspace = useMemo(
    () => state.workspaces.find((w) => w.id === state.activeId) ?? state.workspaces[0] ?? null,
    [state.workspaces, state.activeId],
  )

  const view = useMemo(() => {
    if (!workspace) return null
    return workspace.views.find((v) => v.id === workspace.viewId) ?? workspace.views[0] ?? null
  }, [workspace])

  const setDisplay = (patch: Partial<DisplaySettings>) =>
    setDisplayState((current) => ({ ...current, ...patch }))

  return { ...state, workspace, view, display, setDisplay, dispatch }
}
