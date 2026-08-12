import type { Aggregate } from '../lib/rows'
import styles from './StatusBar.module.css'

interface StatusBarProps {
  count: string
  aggregates: Aggregate[]
  hint: string
}

export function StatusBar({ count, aggregates, hint }: StatusBarProps) {
  return (
    <div className={styles.bar}>
      <span>{count}</span>
      {aggregates.map((agg) => (
        <span key={agg.id} className={styles.aggregate}>
          <span className={styles.aggregateName}>{agg.name}</span> {agg.text}
        </span>
      ))}
      <span className={styles.hint}>{hint}</span>
    </div>
  )
}
