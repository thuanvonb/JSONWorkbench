import type { ArrayConfig, ColumnKind } from './workbench'

export interface ColumnDraft extends ArrayConfig {
  id: string
  name: string
  kind: ColumnKind
  path: string
  code: string
  /** True while adding a column, false while editing an existing one. */
  isNew: boolean
}

/** Which tab the right-hand panel is showing; null closes it. */
export type PanelTab = 'record' | 'schema' | 'columns' | 'filter'

/** What the schema tree is showing: which branches are open, and the filter. */
export interface SchemaViewState {
  open: Record<string, boolean>
  optionalOnly: boolean
}

/** A pending offset, held while the confirm asks about dropping the setup. */
export interface OffsetRequest {
  path: string
}

export interface Point {
  x: number
  y: number
}

export type PopoverState = { kind: 'column'; draft: ColumnDraft } & Point

export interface RenameTarget {
  id: string
  draft: string
}

/** Inline renaming shared by the workspace tabs and the table tabs. */
export interface RenameController {
  target: RenameTarget | null
  start: (id: string, currentName: string) => void
  change: (draft: string) => void
  commit: () => void
  cancel: () => void
}
