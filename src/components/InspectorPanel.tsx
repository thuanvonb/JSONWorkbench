import { useEffect, useState } from 'react'

import type { InspectDetail } from '../lib/inspect'
import styles from './InspectorPanel.module.css'

interface InspectorPanelProps {
  /** Null when nothing is selected, which shows the hint instead. */
  detail: InspectDetail | null
}

const COPIED_RESET_MS = 1200
const HINT = 'Click a row number for the whole record, or a cell for its raw value.'

/** Record tab: the raw value behind the selected cell or row. */
export function InspectorPanel({ detail }: InspectorPanelProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

  if (!detail) return <div className={styles.empty}>{HINT}</div>

  const copy = async () => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(detail.json)
      setCopied(true)
    } catch {
      // Clipboard blocked by the browser; nothing useful to show.
    }
  }

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <span className={styles.title}>{detail.title}</span>
        <span className={styles.kind}>{detail.kind}</span>
        <button type="button" className={styles.copy} onClick={copy}>
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className={styles.body}>{detail.json}</pre>
    </div>
  )
}
