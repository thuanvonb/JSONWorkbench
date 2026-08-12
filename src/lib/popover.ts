import type { Point } from '../types/ui'

const MARGIN = 12
const GAP = 6

/**
 * Places a floating panel under an anchor rect, right-aligned to it, clamped
 * inside the viewport.
 */
export function anchorPopover(anchor: DOMRect | AnchorRect, width: number, height: number): Point {
  return {
    x: Math.max(MARGIN, Math.min(anchor.right - width, window.innerWidth - width - MARGIN)),
    y: Math.max(MARGIN, Math.min(anchor.bottom + GAP, window.innerHeight - height - MARGIN)),
  }
}

export interface AnchorRect {
  right: number
  bottom: number
}

/** Left-aligns the panel to the anchor instead of right-aligning it. */
export function anchorLeftAligned(anchor: DOMRect, width: number, height: number): Point {
  return anchorPopover({ right: anchor.left + width, bottom: anchor.bottom }, width, height)
}

export const COLUMN_POPOVER_SIZE = { width: 330, height: 400 } as const
export const FILTER_POPOVER_SIZE = { width: 330, height: 260 } as const
