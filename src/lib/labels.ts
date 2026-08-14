import type { ArrayMode, TableView, Workspace } from '../types/workbench'
import type { FilterIssueCode } from './filterTree'
import type { Profile } from './profiles'
import type { SchemaCounts } from './schema'

/** Toolbar summary: what the current workspace holds. */
export function workspaceSummary(recordCount: number, columnCount: number, pathCount: number): string {
  if (recordCount === 0) return 'no data yet'
  return `${recordCount} records · ${columnCount} columns · ${pathCount} paths`
}

/** Schema panel header: how much shape was inferred from the records. */
export function schemaSummary(counts: SchemaCounts, recordCount: number): string {
  if (recordCount === 0) return 'no data'
  return `${counts.total} keys · ${counts.optional} optional · ${recordCount} records`
}

/** Schema row's add button: what clicking it would do, or why it is spent. */
export function addColumnTitle(key: string, added: boolean): string {
  return added ? 'Already a column' : `Add "${key}" as a column`
}

/** Filter panel header: how many rows there are, and how many narrow the table. */
export function filterPanelMeta(total: number, applied: number): string {
  if (total === 0) return 'no filter rows yet'
  return `${total} rows · ${applied} applied`
}

/** Filter panel footer: the expression the applied rows add up to. */
export function filterPanelFoot(expression: string, issueCount: number): string {
  const applied = expression ? `applied  ${expression}` : 'no rows applied'
  if (issueCount === 0) return applied
  const rows = issueCount === 1 ? 'row' : 'rows'
  return `${issueCount} ${rows} in error · ${applied}`
}

/** Why one filter row cannot run, shown under the row itself. */
export function filterIssueMessage(code: FilterIssueCode): string {
  switch (code) {
    case 'cycle':
      return 'references itself through another row — ignored'
    case 'unset-operand':
      return 'pick both rows to combine — ignored'
    case 'missing-operand':
      return 'a referenced row is gone — ignored'
    case 'broken-operand':
      return 'a referenced row has an error — ignored'
  }
}

/** What an operand row is folded into, for the disabled flag's tooltip. */
export function foldedInto(position: number | undefined): string {
  return `folded into #${position ?? '?'}`
}

/** Profiles list subtitle: what one saved setup holds. */
export function profileMeta(profile: Profile): string {
  const columns = profile.views.reduce((n, v) => n + v.columns.length, 0)
  const filters = profile.views.reduce((n, v) => n + v.filters.length, 0)
  return `${tableCount(profile.views.length)} · ${columns} columns · ${filters} filters · ${savedDate(profile.savedAt)}`
}

/** What saving right now would capture. */
export function currentSetupLabel(workspace: Workspace, view: TableView): string {
  const sorted = view.sort ? ' · sorted' : ''
  return `current: ${tableCount(workspace.views.length)} · ${view.columns.length} columns · ${view.filters.length} filters${sorted}`
}

function tableCount(count: number): string {
  return count === 1 ? '1 table' : `${count} tables`
}

function savedDate(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()
}

/**
 * Status bar row count, including the render cap when it bites. Once a grain is
 * expanding arrays, rows outnumber records, so both are worth saying.
 */
export function rowCountLabel(
  visibleCount: number,
  totalCount: number,
  maxRows: number,
  recordCount: number | null = null,
): string {
  let base = visibleCount === totalCount ? `${totalCount} rows` : `${visibleCount} of ${totalCount} rows`
  if (recordCount !== null) base += ` · ${recordCount} records`
  return visibleCount > maxRows ? `${base} · showing first ${maxRows}` : base
}

/** Grain bar chip: the array this level expands. */
export function grainChipLabel(path: string): string {
  return `${path}[]`
}

export function grainChipTitle(path: string): string {
  return `Stop expanding ${path}`
}

/** Grain bar button offering the next array down. */
export function nextGrainLabel(key: string): string {
  return `+ ${key}[]`
}

/** Grain bar tally: how many rows the records expanded into. */
export function grainCountLabel(recordCount: number, rowCount: number): string {
  return `${recordCount} → ${rowCount} rows`
}

/** Column header tag: what the column does with the array it crosses. */
export function arrayBadgeLabel(mode: ArrayMode, separator: string, index: number): string {
  switch (mode) {
    case 'expand':
      return '⇲ rows'
    case 'count':
      return 'count'
    case 'join':
      return `join ${separator.trim() || '␣'}`
    case 'index':
      return `[${index}]`
    case 'first':
      return 'first'
  }
}

export function arrayBadgeTitle(mode: ArrayMode, path: string, badge: string): string {
  if (mode === 'expand') return `One row per entry of ${path}`
  return path ? `${path} → ${badge}` : ''
}

/** Column popover: how far the chosen array mode reaches. */
export function arrayModeHint(mode: ArrayMode | null): string {
  return mode === 'expand'
    ? 'One row per entry. Every column under this array follows.'
    : 'Applies to this column only.'
}
