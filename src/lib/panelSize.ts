/** Width the side panel opens at, and the width its grip resets to. */
export const DEFAULT_PANEL_WIDTH = 430

/** Narrowest the panel goes: below this the filter row grid stops fitting. */
const MIN_PANEL_WIDTH = 300

/** Table space the panel may never take, so the grid stays worth looking at. */
const MIN_GRID_WIDTH = 260

/**
 * A dragged width, kept inside what the viewport can carry. The floor wins on a
 * narrow window, where the panel would otherwise be squeezed to nothing.
 */
export function clampPanelWidth(width: number, viewportWidth: number): number {
  return Math.max(MIN_PANEL_WIDTH, Math.min(viewportWidth - MIN_GRID_WIDTH, width))
}
