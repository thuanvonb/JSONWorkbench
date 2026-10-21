import styles from './CopiedToast.module.css'

interface CopiedToastProps {
  label: string
}

/**
 * Confirms a keyboard copy, which otherwise leaves no trace on screen. It fades
 * out by itself; `App` re-keys it on every copy so the animation starts over.
 */
export function CopiedToast({ label }: CopiedToastProps) {
  return (
    <div className={styles.toast} role="status">
      {label}
    </div>
  )
}
