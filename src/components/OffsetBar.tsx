import { cx } from '../lib/cx'
import { offsetCountLabel, offsetCrumbTitle } from '../lib/labels'
import type { OffsetCrumb } from '../lib/offset'
import styles from './OffsetBar.module.css'

interface OffsetBarProps {
  /** The source, then every step down to the table's current root. */
  crumbs: OffsetCrumb[]
  /** Records in the payload, before the offset picked a part of them. */
  sourceCount: number
  recordCount: number
  onOffset: (path: string) => void
}

/**
 * Says which part of the source this table reads, and walks the offset back. It
 * only appears once a table is re-rooted — an offset starts in the schema tree,
 * since that is where the user is looking at the nested key.
 */
export function OffsetBar({ crumbs, sourceCount, recordCount, onOffset }: OffsetBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.lead}>reading from</span>
      {crumbs.map((crumb, level) => (
        <span key={crumb.path || '$source'} className={styles.step}>
          {level > 0 ? <span className={styles.caret}>▸</span> : null}
          {crumb.current ? (
            <span className={cx(styles.chip, styles.chipCurrent)} title={offsetCrumbTitle(crumb.path, true)}>
              <span>{crumb.label}</span>
              <button
                type="button"
                className={styles.drop}
                title="Remove the offset"
                onClick={() => onOffset('')}
              >
                ×
              </button>
            </span>
          ) : (
            <button
              type="button"
              className={styles.chip}
              title={offsetCrumbTitle(crumb.path, false)}
              onClick={() => onOffset(crumb.path)}
            >
              {crumb.label}
            </button>
          )}
        </span>
      ))}

      <span className={styles.trailing}>
        <span className={styles.count}>{offsetCountLabel(sourceCount, recordCount)}</span>
        <button
          type="button"
          className={styles.reset}
          title="Read the whole source again"
          onClick={() => onOffset('')}
        >
          reset to root
        </button>
      </span>
    </div>
  )
}
