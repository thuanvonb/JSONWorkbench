import { cx } from '../lib/cx'
import type { Column, Density, DisplaySettings } from '../types/workbench'
import { Modal } from './Modal'
import styles from './OrganizeModal.module.css'

interface OrganizeModalProps {
  columns: Column[]
  display: DisplaySettings
  onMove: (index: number, dir: -1 | 1) => void
  onDisplayChange: (patch: Partial<DisplaySettings>) => void
  onClose: () => void
}

const DENSITIES: Density[] = ['compact', 'balanced', 'roomy']
const MIN_ROWS = 50
const MAX_ROWS = 5000
const ROW_STEP = 50

export function OrganizeModal({ columns, display, onMove, onDisplayChange, onClose }: OrganizeModalProps) {
  return (
    <Modal
      title="Organize columns"
      width={520}
      onClose={onClose}
      footer={
        <button type="button" className="wb-btn-primary" style={{ marginLeft: 'auto' }} onClick={onClose}>
          Done
        </button>
      }
    >
      <div className={styles.list}>
        {columns.map((col, index) => (
          <div key={col.id} className={styles.row}>
            <span className={styles.ordinal}>{index + 1}</span>
            <div className={styles.labels}>
              <span className={styles.name}>{col.name || '(unnamed)'}</span>
              <span className={styles.source}>{col.kind === 'js' ? col.code : col.path}</span>
            </div>
            <div className={styles.moves}>
              <button
                type="button"
                className={styles.move}
                title="Move up"
                aria-label={`Move ${col.name} up`}
                disabled={index === 0}
                onClick={() => onMove(index, -1)}
              >
                ▲
              </button>
              <button
                type="button"
                className={styles.move}
                title="Move down"
                aria-label={`Move ${col.name} down`}
                disabled={index === columns.length - 1}
                onClick={() => onMove(index, 1)}
              >
                ▼
              </button>
            </div>
          </div>
        ))}
        {columns.length === 0 ? <div className={styles.empty}>No columns in this table yet.</div> : null}
      </div>

      <div className={styles.section}>
        <span className={styles.sectionTitle}>Display</span>
        <div className={styles.settings}>
          <div className={cx('wb-segmented', styles.density)}>
            {DENSITIES.map((density) => (
              <button
                key={density}
                type="button"
                className={cx('wb-segmented-option', display.density === density && 'wb-segmented-option-active')}
                onClick={() => onDisplayChange({ density })}
              >
                {density}
              </button>
            ))}
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={display.zebra}
              onChange={(event) => onDisplayChange({ zebra: event.target.checked })}
            />
            zebra rows
          </label>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={display.showTypeRow}
              onChange={(event) => onDisplayChange({ showTypeRow: event.target.checked })}
            />
            show sources
          </label>
          <label className={styles.rowCap}>
            max rows
            <input
              className={cx('wb-input', styles.rowCapInput)}
              type="number"
              min={MIN_ROWS}
              max={MAX_ROWS}
              step={ROW_STEP}
              value={display.maxRows}
              onChange={(event) => {
                const next = Number.parseInt(event.target.value, 10)
                if (!Number.isNaN(next)) {
                  onDisplayChange({ maxRows: Math.min(MAX_ROWS, Math.max(MIN_ROWS, next)) })
                }
              }}
            />
          </label>
        </div>
      </div>
    </Modal>
  )
}
