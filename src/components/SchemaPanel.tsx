import { useEffect, useMemo, useState } from 'react'

import { cx } from '../lib/cx'
import { isolate } from '../lib/events'
import { schemaSummary } from '../lib/labels'
import { buildSchema, countSchema, expandablePaths, flattenSchema } from '../lib/schema'
import type { SchemaViewState } from '../types/ui'
import type { Row } from '../types/workbench'
import styles from './SchemaPanel.module.css'

interface SchemaPanelProps {
  rows: Row[]
  state: SchemaViewState
  onChange: (patch: Partial<SchemaViewState>) => void
}

const COPIED_RESET_MS = 1100
const INDENT_BASE = 10
const INDENT_STEP = 14
const FOOT_HINT = 'click a row to copy its path · ▸ to expand'

/** Schema tab: the shape inferred from the records, as a collapsible tree. */
export function SchemaPanel({ rows, state, onChange }: SchemaPanelProps) {
  const [copiedPath, setCopiedPath] = useState('')

  const schema = useMemo(() => buildSchema(rows), [rows])
  const counts = useMemo(() => countSchema(schema), [schema])
  const expandable = useMemo(() => expandablePaths(schema), [schema])
  const nodes = useMemo(
    () => flattenSchema(schema, state.open, state.optionalOnly),
    [schema, state.open, state.optionalOnly],
  )

  useEffect(() => {
    if (!copiedPath) return
    const timer = window.setTimeout(() => setCopiedPath(''), COPIED_RESET_MS)
    return () => window.clearTimeout(timer)
  }, [copiedPath])

  const allOpen = expandable.length > 0 && expandable.every((path) => state.open[path])

  const toggleExpandAll = () => {
    if (allOpen) return onChange({ open: {} })
    const open: Record<string, boolean> = {}
    for (const path of expandable) open[path] = true
    onChange({ open })
  }

  const toggleBranch = (path: string) =>
    onChange({ open: { ...state.open, [path]: !state.open[path] } })

  const copyPath = async (path: string) => {
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(path)
      } catch {
        // Clipboard blocked; the row still flashes so the click is acknowledged.
      }
    }
    setCopiedPath(path)
  }

  const emptyText = !rows.length
    ? 'No data parsed yet.'
    : state.optionalOnly
      ? 'Every key appears on every record — no optional keys.'
      : 'Records have no object keys to describe.'

  return (
    <div className={styles.tab}>
      <div className={styles.header}>
        <span className={styles.meta}>{schemaSummary(counts, rows.length)}</span>
        <button
          type="button"
          className={cx(styles.chip, state.optionalOnly && styles.chipActive)}
          title="Keys that appear on some records but not all"
          aria-pressed={state.optionalOnly}
          onClick={() => onChange({ optionalOnly: !state.optionalOnly })}
        >
          <span className={styles.chipMark}>{state.optionalOnly ? '✓' : ''}</span>
          <span>optional</span>
        </button>
        <button type="button" className={styles.expand} onClick={toggleExpandAll}>
          {allOpen ? 'collapse all' : 'expand all'}
        </button>
      </div>

      <div className={styles.tree}>
        {nodes.map((node) => (
          <div
            key={node.path}
            className={cx(styles.row, copiedPath === node.path && styles.rowCopied)}
            style={{ paddingLeft: INDENT_BASE + node.depth * INDENT_STEP }}
            title="Click to copy path"
            onClick={() => void copyPath(node.path)}
          >
            {node.hasChildren ? (
              <button
                type="button"
                className={styles.caret}
                aria-label={node.open ? `Collapse ${node.key}` : `Expand ${node.key}`}
                onClick={isolate(() => toggleBranch(node.path))}
              >
                {node.open ? '▾' : '▸'}
              </button>
            ) : (
              <span className={styles.caret} />
            )}
            <span className={cx(styles.key, node.hasChildren && styles.keyBranch)} title={node.path}>
              {node.key}
            </span>
            {node.optional ? (
              <span className={styles.optional} title={`present on ${node.present} of ${node.of}`}>
                opt
              </span>
            ) : null}
            {node.mixed ? (
              <span className={styles.mixed} title="More than one type across records">
                mixed
              </span>
            ) : null}
            <span className={styles.type}>{node.type}</span>
          </div>
        ))}
        {nodes.length === 0 ? <div className={styles.empty}>{emptyText}</div> : null}
      </div>

      <div className={styles.foot}>{copiedPath ? `copied  ${copiedPath}` : FOOT_HINT}</div>
    </div>
  )
}
