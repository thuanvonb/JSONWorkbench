/** The part of a rectangle the scrolling maths needs; a DOMRect satisfies it. */
export interface Edges {
  top: number
  bottom: number
  left: number
  right: number
}

export interface ScrollPad {
  top: number
  left: number
}

/** Room left for the sticky header row and the sticky index column. */
export const CELL_SCROLL_PAD: ScrollPad = { top: 34, left: 50 }

/** How far a container has to scroll for a cell inside it to be fully visible. */
export function scrollDeltas(container: Edges, cell: Edges, pad: ScrollPad): { dx: number; dy: number } {
  let dy = 0
  if (cell.top < container.top + pad.top) dy = cell.top - container.top - pad.top
  else if (cell.bottom > container.bottom) dy = cell.bottom - container.bottom

  let dx = 0
  if (cell.left < container.left + pad.left) dx = cell.left - container.left - pad.left
  else if (cell.right > container.right) dx = cell.right - container.right

  return { dx, dy }
}
