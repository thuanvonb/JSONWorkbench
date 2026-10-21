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


/**
 * A schema stripped to what survives in storage: the keys each container held
 * and whether each was optional. Profiles keep one, so it must be plain JSON.
 */
export interface SchemaShape {
  keys: Record<string, SchemaShapeKey>
}

export interface SchemaShapeKey {
  optional: boolean
  /** The object shape below the key; null when no object was ever seen there. */
  child: SchemaShape | null
}

/** Null when nothing object-shaped was observed, so there is no shape to keep. */
export function toSchemaShape(cont: SchemaContainer): SchemaShape | null {
  if (cont.observed === 0) return null
  const keys: Record<string, SchemaShapeKey> = {}
  for (const node of cont.children.values()) {
    keys[node.key] = { optional: node.present < cont.observed, child: toSchemaShape(node.child) }
  }
  return { keys }
}

export function schemaShapeOf(rows: Row[]): SchemaShape | null {
  return toSchemaShape(buildSchema(rows))
}

/** Reads a stored shape back, dropping anything malformed rather than trusting it. */
export function readSchemaShape(input: unknown): SchemaShape | null {
  if (!isPlainRecord(input) || !isPlainRecord(input.keys)) return null
  const keys: Record<string, SchemaShapeKey> = {}
  for (const [key, entry] of Object.entries(input.keys)) {
    if (!isPlainRecord(entry)) continue
    keys[key] = { optional: entry.optional === true, child: readSchemaShape(entry.child) }
  }
  return { keys }
}

/**
 * Paths `a` requires that `b` does not hold. Normally only a key `b` lacks
 * outright counts; `strict` also counts one `b` holds on just some objects.
 * Below the root, a container one side never observed (an array empty on every
 * record) is no evidence either way.
 */
export function requiredGaps(a: SchemaShape | null, b: SchemaShape | null, strict: boolean): string[] {
  const out: string[] = []

  const walk = (x: SchemaShape, y: SchemaShape, prefix: string): void => {
    for (const [key, entry] of Object.entries(x.keys)) {
      const path = prefix ? `${prefix}.${key}` : key
      const other = y.keys[key]
      if (!other) {
        if (!entry.optional) out.push(path)
      } else if (strict && !entry.optional && other.optional) {
        out.push(path)
      } else if (entry.child && other.child) {
        walk(entry.child, other.child, path)
      }
    }
  }

  if (a) walk(a, b ?? { keys: {} }, '')
  return out
}

/**
 * Both shapes at once: every key either side held, required only where both
 * required it. A container one side never observed takes the other's shape.
 */
export function unionSchemaShapes(a: SchemaShape | null, b: SchemaShape | null): SchemaShape | null {
  if (!a) return b
  if (!b) return a
  const keys: Record<string, SchemaShapeKey> = {}
  for (const key of new Set([...Object.keys(a.keys), ...Object.keys(b.keys)])) {
    const x = a.keys[key]
    const y = b.keys[key]
    keys[key] = {
      optional: !x || !y || x.optional || y.optional,
      child: unionSchemaShapes(x?.child ?? null, y?.child ?? null),
    }
  }
  return { keys }
}

export function countSchemaShape(shape: SchemaShape | null): SchemaCounts {
  let total = 0
  let optional = 0
  for (const entry of Object.values(shape?.keys ?? {})) {
    total++
    if (entry.optional) optional++
    const sub = countSchemaShape(entry.child)
    total += sub.total
    optional += sub.optional
  }
  return { total, optional }
}

/** One way new records disagree with the old ones: a key that was always there and is gone, or the reverse. */
export interface SchemaDrift {
  path: string
  change: 'missing' | 'added'
}

/**
 * Where the shape of `next` breaks from `prev`, so a re-parse can tell an edit
 * of the same data from a different payload. Only *required* keys count — one
 * present on every object observed at that point. An optional key may come and
 * go without it being drift, which is why one record dropping `discount` no
 * longer reads as a new shape.
 */
export function schemaDrift(prev: Row[], next: Row[]): SchemaDrift[] {
  const a = schemaShapeOf(prev)
  const b = schemaShapeOf(next)
  return [
    ...requiredGaps(a, b, false).map((path): SchemaDrift => ({ path, change: 'missing' })),
    ...requiredGaps(b, a, false).map((path): SchemaDrift => ({ path, change: 'added' })),
  ]
}
