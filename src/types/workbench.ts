/** A single parsed record. Usually an object, but JSON allows anything. */
export type Row = unknown

export type ColumnKind = 'path' | 'js'

export interface Column {
  id: string
  name: string
  kind: ColumnKind
  /** Dot/bracket path into the row. Used when `kind === 'path'`. */
  path?: string
  /** Expression evaluated with `row` and `i` in scope. Used when `kind === 'js'`. */
  code?: string
}

export type FilterOp =
  | 'contains'
  | 'ncontains'
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'empty'
  | 'nempty'
  | 'regex'

/** Boolean connective a compound filter row combines its two operands with. */
export type BoolOp = 'AND' | 'OR' | 'XOR' | 'NAND' | 'NOR' | 'XNOR' | 'IMPLIES' | 'NOT IMPLIES'

interface FilterRow {
  id: string
  /** Only applied rows narrow the table, so a row can be parked while it is written. */
  enabled: boolean
}

export interface SimpleFilter extends FilterRow {
  type: 'simple'
  colId: string
  op: FilterOp
  value: string
}

export interface CustomFilter extends FilterRow {
  type: 'custom'
  code: string
}

/**
 * Combines two other filter rows by id. The panel labels them `#1`, `#2` by
 * position, but ids are what is stored, so deleting or reordering a row can
 * never silently re-point a compound at a different condition.
 */
export interface CompoundFilter extends FilterRow {
  type: 'compound'
  /** Id of the operand row, or null while it is unset. */
  left: string | null
  cop: BoolOp
  right: string | null
}

export type Filter = SimpleFilter | CustomFilter | CompoundFilter

export type FilterType = Filter['type']

export type SortDir = 'asc' | 'desc'

export interface Sort {
  colId: string
  dir: SortDir
}

/** One table built on top of a workspace's records. */
export interface TableView {
  id: string
  name: string
  columns: Column[]
  filters: Filter[]
  sort: Sort | null
}

/** A set of records plus every table built on them. */
export interface Workspace {
  id: string
  name: string
  raw: string
  rows: Row[]
  views: TableView[]
  viewId: string
}

/** A row paired with its index in the unfiltered record list. */
export interface RowRef {
  row: Row
  i: number
}

export type Inspect = { kind: 'row'; i: number } | { kind: 'cell'; i: number; colId: string }

export type Density = 'compact' | 'balanced' | 'roomy'

export interface DisplaySettings {
  density: Density
  zebra: boolean
  showTypeRow: boolean
  maxRows: number
}

export const DEFAULT_DISPLAY: DisplaySettings = {
  density: 'balanced',
  zebra: true,
  showTypeRow: false,
  maxRows: 300,
}
