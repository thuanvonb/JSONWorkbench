import { cx } from '../lib/cx'
import {
  grainChipLabel,
  grainChipTitle,
  grainCountLabel,
  nextGrainLabel,
} from '../lib/labels'
import styles from './GrainBar.module.css'

interface GrainBarProps {
  /** Absolute path of each expanded array, outermost first. */
  paths: string[]
  keepEmpty: boolean
  /** The next array below the deepest level, when the records hold one. */
  nextKey: string | null
  recordCount: number
  rowCount: number
  /** Stops expanding from this level down. */
  onTrim: (level: number) => void
  onAddNext: () => void
  onToggleKeepEmpty: () => void
}

/**
 * Says what one row of the table is, and lets the grain be walked back. It only
 * appears once something is expanded — the column popover is where a grain
 * starts.
 */
export function GrainBar({
  paths,
  keepEmpty,
  nextKey,
  recordCount,
  rowCount,
  onTrim,
  onAddNext,
  onToggleKeepEmpty,
}: GrainBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.lead}>1 row per</span>
      <span className={styles.record}>record</span>
      {paths.map((path, level) => (
        <span key={path} className={styles.step}>
          <span className={styles.caret}>▸</span>
          <span className={styles.chip}>
            <span>{grainChipLabel(path)}</span>
            <button
              type="button"
              className={styles.drop}
              title={grainChipTitle(path)}
              onClick={() => onTrim(level)}
            >
              ×
            </button>
          </span>
        </span>
      ))}
      {nextKey ? (
        <button
          type="button"
          className={styles.next}
          title="Also expand the nested array"
          onClick={onAddNext}
        >
          {nextGrainLabel(nextKey)}
        </button>
      ) : null}

      <span className={styles.trailing}>
        <button
          type="button"
          className={styles.keep}
          title="Keep records whose array is empty, with blank cells"
          onClick={onToggleKeepEmpty}
        >
          <span className={cx(styles.mark, keepEmpty && styles.markOn)}>{keepEmpty ? '✓' : ''}</span>
          <span>keep empty rows</span>
        </button>
        <span className={styles.count}>{grainCountLabel(recordCount, rowCount)}</span>
      </span>
    </div>
  )
}
