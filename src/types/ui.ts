import type { ColumnKind, FilterOp } from './workbench'

/** Sentinel column id used by the filter popover to mean "raw JS predicate". */
export const JS_FILTER_OPTION = '@js'

export interface ColumnDraft {
  id: string
  name: string
  kind: ColumnKind
  path: string
  code: string
  /** True while adding a column, false while editing an existing one. */
  isNew: boolean
}

export interface FilterDraft {
  /** A column id, or `JS_FILTER_OPTION`. */
  colId: string
  op: FilterOp
  value: string
  code: string
}

export interface Point {
  x: number
  y: number
}

export type PopoverState =
  | ({ kind: 'column'; draft: ColumnDraft } & Point)
  | ({ kind: 'filter'; draft: FilterDraft } & Point)

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
