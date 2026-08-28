import { useEffect } from 'react'

import { CELL_SCROLL_PAD, scrollDeltas } from '../lib/scroll'

/**
 * Keeps the selected cell on screen while the arrow keys walk the table. The
 * cell is found by its `data-cell` attribute rather than a ref, so the table
 * stays a plain render of the rows it was given.
 */
export function useCellIntoView(cellKey: string): void {
  useEffect(() => {
    if (!cellKey) return
    const cell = findCell(cellKey)
    const scroller = cell ? scrollableAncestor(cell) : null
    if (!cell || !scroller) return

    const { dx, dy } = scrollDeltas(
      scroller.getBoundingClientRect(),
      cell.getBoundingClientRect(),
      CELL_SCROLL_PAD,
    )
    scroller.scrollLeft += dx
    scroller.scrollTop += dy
  }, [cellKey])
}

function findCell(cellKey: string): HTMLElement | null {
  try {
    return document.querySelector<HTMLElement>(`[data-cell="${CSS.escape(cellKey)}"]`)
  } catch {
    return null
  }
}

function scrollableAncestor(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement
  while (node && node !== document.body) {
    const style = getComputedStyle(node)
    if (/(auto|scroll)/.test(style.overflowY) || /(auto|scroll)/.test(style.overflowX)) return node
    node = node.parentElement
  }
  return null
}
