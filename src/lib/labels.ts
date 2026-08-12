/** Toolbar summary: what the current workspace holds. */
export function workspaceSummary(recordCount: number, columnCount: number, pathCount: number): string {
  if (recordCount === 0) return 'no data yet'
  return `${recordCount} records · ${columnCount} columns · ${pathCount} paths`
}

/** Status bar row count, including the render cap when it bites. */
export function rowCountLabel(visibleCount: number, totalCount: number, maxRows: number): string {
  const base = visibleCount === totalCount ? `${totalCount} rows` : `${visibleCount} of ${totalCount} rows`
  return visibleCount > maxRows ? `${base} · showing first ${maxRows}` : base
}
