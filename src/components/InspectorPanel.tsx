import { useEffect, useState } from 'react'

import type { InspectDetail } from '../lib/inspect'
import styles from './InspectorPanel.module.css'

interface InspectorPanelProps {
  detail: InspectDetail
  onClose: () => void
}

const COPIED_RESET_MS = 1200

/** Right-hand panel showing the raw value behind the selected cell or row. */
export function InspectorPanel({ detail, onClose }: InspectorPanelProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), COPIED_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copied])

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
    <aside className={styles.panel} aria-label="Value inspector">
      <div className={styles.header}>
        <span className={styles.title}>{detail.title}</span>
        <span className={styles.kind}>{detail.kind}</span>
        <button type="button" className={styles.copy} onClick={copy}>
          {copied ? 'copied' : 'copy'}
        </button>
        <button type="button" className={`wb-icon-btn ${styles.close}`} onClick={onClose} aria-label="Close inspector">
          ×
        </button>
      </div>
      <pre className={styles.body}>{detail.json}</pre>
    </aside>
  )
}
