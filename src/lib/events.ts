import type { MouseEvent, SyntheticEvent } from 'react'

/** Keeps a click inside a panel from reaching the scrim that closes it. */
export function stopPropagation(event: SyntheticEvent): void {
  event.stopPropagation()
}

/** Runs an action without letting the click select the surrounding tab or row. */
export function isolate(action: () => void) {
  return (event: MouseEvent) => {
    event.stopPropagation()
    action()
  }
}
