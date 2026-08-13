import type { Point } from '../types/ui'

const MARGIN = 12
const GAP = 6

/**
 * Places a floating panel under an anchor rect, right-aligned to it, clamped
 * inside the viewport.
 */
export function anchorPopover(anchor: DOMRect, width: number, height: number): Point {
  return {
    x: Math.max(MARGIN, Math.min(anchor.right - width, window.innerWidth - width - MARGIN)),
    y: Math.max(MARGIN, Math.min(anchor.bottom + GAP, window.innerHeight - height - MARGIN)),
  }
}

export const COLUMN_POPOVER_SIZE = { width: 330, height: 400 } as const
