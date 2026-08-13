import type { Column, Row } from '../types/workbench'
import { typeOf } from './path'

/** Array items sampled when describing what an array holds. */
const ARRAY_SAMPLE = 25

/** The records seen at one position in the shape, and the keys they carried. */
export interface SchemaContainer {
  children: Map<string, SchemaKey>
  /** Objects observed here; a key present on fewer of them is optional. */
  observed: number
}

/** One key of a container, with every type it was seen holding. */
export interface SchemaKey {
  key: string
  types: Record<string, number>
  /** Scalar types found inside an array value, or null when it held none. */
  itemTypes: Record<string, number> | null
  present: number
  /** Object shape found under this key, including objects inside an array. */
  child: SchemaContainer
}

/** A flattened row of the schema tree, ready to render. */
export interface SchemaRow {
  path: string
  key: string
  depth: number
  optional: boolean
  present: number
  of: number
  mixed: boolean
  type: string
  hasChildren: boolean
  open: boolean
}

export interface SchemaCounts {
  total: number
  optional: number
}

function container(): SchemaContainer {
  return { children: new Map(), observed: 0 }
}

function isPlainRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

/**
 * Walks the records and records, for every key, how often it appeared and which
 * types it held. Objects inside an array fold into the same child shape, so
 * `items[].id` is described once rather than per element.
 */
export function buildSchema(rows: Row[]): SchemaContainer {
  const root = container()

  const visit = (cont: SchemaContainer, obj: Record<string, unknown>): void => {
    cont.observed++
    for (const key of Object.keys(obj)) {
      let node = cont.children.get(key)
      if (!node) {
        node = { key, types: {}, itemTypes: null, present: 0, child: container() }
        cont.children.set(key, node)
      }
      node.present++
      const value = obj[key]
      const type = typeOf(value)
      node.types[type] = (node.types[type] ?? 0) + 1

      if (isPlainRecord(value)) {
        visit(node.child, value)
      } else if (Array.isArray(value)) {
        for (const item of value.slice(0, ARRAY_SAMPLE)) {
          if (isPlainRecord(item)) {
            visit(node.child, item)
          } else {
            node.itemTypes = node.itemTypes ?? {}
            const itemType = typeOf(item)
            node.itemTypes[itemType] = (node.itemTypes[itemType] ?? 0) + 1
          }
        }
      }
    }
  }

  for (const row of rows) {
    if (isPlainRecord(row)) visit(root, row)
  }
  return root
}

/**
 * The type column: every type the key held, commonest first, with `null` pushed
 * to the end and arrays annotated with what they contained.
 */
export function typeLabel(node: SchemaKey): string {
  const types = Object.keys(node.types).filter((t) => t !== 'null' && t !== '—')
  if (types.length === 0) return 'null'

  types.sort((a, b) => node.types[b] - node.types[a])
  const label = types
    .map((type) => {
      if (type !== 'array') return type
      const inner: string[] = []
      if (node.child.observed) inner.push('object')
      for (const item of Object.keys(node.itemTypes ?? {})) {
        if (!inner.includes(item)) inner.push(item)
      }
      return inner.length ? `array<${inner.join('|')}>` : 'array'
    })
    .join(' | ')

  return node.types['null'] ? `${label} | null` : label
}

/** True when the key held more than one type across the records. */
export function isMixed(node: SchemaKey): boolean {
  return Object.keys(node.types).filter((t) => t !== 'null' && t !== '—').length > 1
}

/** True when anything below this point is optional, so a filtered branch still shows. */
function hasOptionalDeep(cont: SchemaContainer): boolean {
  for (const node of cont.children.values()) {
    if (node.present < cont.observed) return true
    if (hasOptionalDeep(node.child)) return true
  }
  return false
}

export function countSchema(cont: SchemaContainer): SchemaCounts {
  let total = 0
  let optional = 0
  for (const node of cont.children.values()) {
    total++
    if (node.present < cont.observed) optional++
    const sub = countSchema(node.child)
    total += sub.total
    optional += sub.optional
  }
  return { total, optional }
}

/**
 * Flattens the tree to the rows currently visible: a branch contributes its
 * children only while it is open.
 */
export function flattenSchema(
  root: SchemaContainer,
  open: Record<string, boolean>,
  optionalOnly: boolean,
): SchemaRow[] {
  const out: SchemaRow[] = []

  const walk = (cont: SchemaContainer, prefix: string, depth: number): void => {
    for (const node of cont.children.values()) {
      const path = prefix ? `${prefix}.${node.key}` : node.key
      const optional = node.present < cont.observed
      if (optionalOnly && !optional && !hasOptionalDeep(node.child)) continue

      const hasChildren = node.child.children.size > 0
      const isOpen = !!open[path]
      out.push({
        path,
        key: node.key,
        depth,
        optional,
        present: node.present,
        of: cont.observed,
        mixed: isMixed(node),
        type: typeLabel(node),
        hasChildren,
        open: isOpen,
      })
      if (hasChildren && isOpen) walk(node.child, path, depth + 1)
    }
  }

  walk(root, '', 0)
  return out
}

/** Paths the table already shows, so the tree can mark those keys as added. */
export function columnedPaths(columns: Column[]): Set<string> {
  return new Set(columns.flatMap((c) => (c.kind === 'path' && c.path ? [c.path] : [])))
}

/** Every path that can be expanded, for the expand-all / collapse-all toggle. */
export function expandablePaths(cont: SchemaContainer, prefix = ''): string[] {
  const out: string[] = []
  for (const node of cont.children.values()) {
    const path = prefix ? `${prefix}.${node.key}` : node.key
    if (node.child.children.size > 0) {
      out.push(path)
      out.push(...expandablePaths(node.child, path))
    }
  }
  return out
}
