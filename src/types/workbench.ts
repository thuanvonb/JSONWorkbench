/** A single parsed record. Usually an object, but JSON allows anything. */
export type Row = unknown

export type ColumnKind = 'path' | 'js'

/**
 * What a path column does when it crosses an array on the way to its value.
 * `'expand'` is the odd one out: it does not resolve the array at all, it puts
 * the array on the table's grain so every entry gets its own row.
 */
export type ArrayMode = 'first' | 'index' | 'join' | 'count' | 'expand'

/** The array handling of a column, or of the draft in the column popover. */
export interface ArrayConfig {
  arrayMode?: ArrayMode | null
  /** Entry read when `arrayMode === 'index'`. */
  arrayIndex?: number
  /** Separator used when `arrayMode === 'join'`. */
  joinSep?: string
}

export interface Column extends ArrayConfig {
  id: string
  name: string
  kind: ColumnKind
  /** Dot/bracket path into the row. Used when `kind === 'path'`. */
  path?: string
  /** Expression evaluated with `row`, `i` and `item` in scope. Used when `kind === 'js'`. */
  code?: string
}

/**
 * One array the table expands into rows. `path` is relative to the level above,
 * so the levels read as a chain: `orders` then `lines` means `orders[].lines[]`.
 */
export interface GrainLevel {
  path: string
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
  /**
   * Path this table reads instead of the whole payload; '' is the source itself.
   * Changing it re-roots everything below, so the columns, filters, grain and
   * sort are dropped with it.
   */
  offset: string
  columns: Column[]
  filters: Filter[]
  sort: Sort | null
  /** Arrays expanded into rows, outermost first. Empty means one row per record. */
  grain: GrainLevel[]
  /** Keep a record whose expanded array is empty, as one row with blank cells. */
  keepEmpty: boolean
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

/**
 * One table row: the record it came from, plus where inside it the row sits once
 * the view's grain has expanded its arrays.
 */
export interface RowRef {
  row: Row
  /** Index in the unfiltered record list, which the inspector and `#` refer to. */
  i: number
  /** Value at each grain level; `scopes[0]` is the record itself. */
  scopes: unknown[]
  /** Array entry picked at each grain level. Empty when the view has no grain. */
  idx: number[]
  /** The view's absolute grain paths, so a cell can resolve without them passed in. */
  abs: string[]
  /** Identifies the row across renders: the record index plus its entry indexes. */
  key: string
}

/** A selection is keyed by row, since one record can now hold several rows. */
export type Inspect =
  | { kind: 'row'; key: string; i: number }
  | { kind: 'cell'; key: string; i: number; colId: string }

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
