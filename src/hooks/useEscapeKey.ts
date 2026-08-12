import { useEffect } from 'react'

/** Calls `onEscape` while the component is mounted. Used by overlays. */
export function useEscapeKey(onEscape: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onEscape()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onEscape])
}
