import type { Column, Inspect, RowRef } from '../types/workbench'

/** The arrow keys the table answers to. */
export type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight'

const ARROW_KEYS: ArrowKey[] = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']

export function isArrowKey(key: string): key is ArrowKey {
  return (ARROW_KEYS as string[]).includes(key)
}

/** A position in the grid of visible rows and columns. */
export interface GridPosition {
  row: number
  col: number
}

export interface GridCursor extends GridPosition {
  /** A whole-record selection sits on no column, so left/right have nothing to walk. */
  rowOnly: boolean
}

/**
 * Where the current selection sits. A row that filtering or a grain change took
 * away falls back to the top of the table rather than losing the cursor.
 */
export function cursorFor(inspect: Inspect | null, rows: RowRef[], columns: Column[]): GridCursor | null {
  if (!inspect) return null
  const row = rows.findIndex((r) => r.key === inspect.key)
  const col = inspect.kind === 'cell' ? columns.findIndex((c) => c.id === inspect.colId) : -1
  return { row: row === -1 ? 0 : row, col: col === -1 ? 0 : col, rowOnly: inspect.kind !== 'cell' }
}

/** Moves the cursor one step, stopping at the edges of the table. */
export function moveCursor(
  key: ArrowKey,
  cursor: GridCursor | null,
  rowCount: number,
  colCount: number,
): GridPosition {
  // Nothing selected yet: the first arrow key lands on the first cell.
  if (!cursor) return { row: 0, col: 0 }

  const clamp = (n: number, count: number): number => Math.min(Math.max(n, 0), count - 1)

  switch (key) {
    case 'ArrowUp':
      return { row: clamp(cursor.row - 1, rowCount), col: cursor.col }
    case 'ArrowDown':
      return { row: clamp(cursor.row + 1, rowCount), col: cursor.col }
    case 'ArrowLeft':
      return { row: cursor.row, col: cursor.rowOnly ? cursor.col : clamp(cursor.col - 1, colCount) }
    case 'ArrowRight':
      return { row: cursor.row, col: cursor.rowOnly ? cursor.col : clamp(cursor.col + 1, colCount) }
  }
}

/** Identifies one cell in the DOM, so the selected one can be scrolled to. */
export function cellDomKey(rowKey: string, colId: string): string {
  return `${rowKey}|${colId}`
}
