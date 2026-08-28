import { useEffect } from 'react'

import type { ArrowKey } from '../lib/gridNav'
import { isArrowKey } from '../lib/gridNav'

interface GridKeysOptions {
  /** False while an overlay owns the keyboard, so a modal's own keys still work. */
  enabled: boolean
  onMove: (key: ArrowKey) => void
  onEscape: () => void
}

/**
 * Document-level arrow-key handling for the table. It lives here rather than on
 * the table itself because the selection is owned by `App` and nothing in the
 * grid holds focus.
 */
export function useGridKeys({ enabled, onMove, onEscape }: GridKeysOptions): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      // Modified arrows are the browser's (word jumps, history, zoom).
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return
      if (event.key === 'Escape') {
        onEscape()
        return
      }
      if (!isArrowKey(event.key)) return
      // Otherwise the arrow scrolls the table out from under the selection.
      event.preventDefault()
      onMove(event.key)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [enabled, onMove, onEscape])
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || !element.tagName) return false
  if (element.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}
