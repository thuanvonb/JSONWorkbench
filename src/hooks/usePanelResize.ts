import { useCallback, useEffect, useRef, useState } from 'react'
import type { MouseEvent as ReactMouseEvent } from 'react'

import { clampPanelWidth } from '../lib/panelSize'

export interface PanelResize {
  /** True while the pointer is down, so the grip can stay lit. */
  resizing: boolean
  start: (event: ReactMouseEvent) => void
}

/**
 * Drag-to-resize for the right-hand panel. The width itself lives with the rest
 * of the ephemeral UI state in `App`, so it survives the panel being closed;
 * this only owns the drag.
 */
export function usePanelResize(width: number, onWidth: (width: number) => void): PanelResize {
  const [resizing, setResizing] = useState(false)
  const origin = useRef({ x: 0, width })
  // The callback identity changes every render; the listeners are attached once.
  const report = useRef(onWidth)
  report.current = onWidth

  useEffect(() => {
    if (!resizing) return

    const move = (event: MouseEvent) => {
      // The grip is on the panel's left edge, so dragging left widens it.
      const next = origin.current.width + (origin.current.x - event.clientX)
      report.current(clampPanelWidth(next, window.innerWidth))
    }
    const stop = () => setResizing(false)

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', stop)
    // The cursor and the selection lock belong to the whole page while dragging,
    // since the pointer leaves the grip immediately.
    document.body.classList.add('wb-resizing')

    return () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', stop)
      document.body.classList.remove('wb-resizing')
    }
  }, [resizing])

  const start = useCallback(
    (event: ReactMouseEvent) => {
      // Keeps the drag from selecting the panel's text.
      event.preventDefault()
      origin.current = { x: event.clientX, width }
      setResizing(true)
    },
    [width],
  )

  return { resizing, start }
}
