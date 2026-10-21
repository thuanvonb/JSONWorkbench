import { useEffect } from 'react'

import type { ArrowKey } from '../lib/gridNav'
import { isArrowKey } from '../lib/gridNav'

interface GridKeysOptions {
  /** False while an overlay owns the keyboard, so a modal's own keys still work. */
  enabled: boolean
  onMove: (key: ArrowKey) => void
  onEscape: () => void
  /** The text Ctrl/Cmd+C copies for the current selection, or null when nothing is selected. */
  copyText: () => string | null
}

/**
 * Document-level arrow-key and copy handling for the table. It lives here rather
 * than on the table itself because the selection is owned by `App` and nothing
 * in the grid holds focus.
 */
export function useGridKeys({ enabled, onMove, onEscape, copyText }: GridKeysOptions): void {
  useEffect(() => {
    if (!enabled) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (isCopyShortcut(event)) {
        copySelection(event, copyText)
        return
      }
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
  }, [enabled, onMove, onEscape, copyText])
}

function isCopyShortcut(event: KeyboardEvent): boolean {
  // Ctrl+Shift+C opens the devtools inspector in most browsers; leave it be.
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'c'
}

/**
 * Copies the selected cell or row, unless the user is copying something of
 * their own: text typed into a field, or text highlighted on the page.
 */
function copySelection(event: KeyboardEvent, copyText: () => string | null): void {
  if (isTyping(event.target)) return
  const highlighted = window.getSelection()
  if (highlighted && !highlighted.isCollapsed) return
  const text = copyText()
  if (text === null || !navigator.clipboard) return
  event.preventDefault()
  navigator.clipboard.writeText(text).catch(() => {
    // Clipboard blocked by the browser; nothing useful to show.
  })
}

function isTyping(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null
  if (!element || !element.tagName) return false
  if (element.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName)
}
