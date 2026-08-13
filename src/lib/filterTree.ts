import type {
  BoolOp,
  Column,
  CompoundFilter,
  CustomFilter,
  Filter,
  Row,
  SimpleFilter,
} from '../types/workbench'
import { passesFilter } from './filters'

/** A leaf tests a row on its own; a branch joins two nodes with a connective. */
export type FilterNode =
  | { kind: 'leaf'; filter: SimpleFilter | CustomFilter }
  | { kind: 'branch'; filter: CompoundFilter; left: FilterNode; right: FilterNode }

/** Why a row cannot be turned into a node. Such a row narrows nothing. */
export type FilterIssueCode = 'cycle' | 'unset-operand' | 'missing-operand' | 'broken-operand'

export interface FilterPlan {
  /** The predicates that narrow the table, ANDed together. */
  roots: FilterNode[]
  /** Row id → the compound row that folded it in, so it no longer applies alone. */
  consumed: Map<string, string>
  issues: Map<string, FilterIssueCode>
  /** 1-based row number per row id: the `#N` the panel shows. */
  position: Map<string, number>
}

/**
 * Resolves the flat filter rows into the trees that actually run.
 *
 * Compound rows reference other rows by id, so the rows form a graph that has
 * to be walked rather than a list that can be folded. An enabled compound
 * *consumes* its operands: they become sub-expressions and stop applying on
 * their own, which is the only reading under which OR, XOR and NOR mean
 * anything. Anything unresolvable — a cycle, an unset or deleted operand —
 * becomes an issue against the row and is left out of the plan entirely, so a
 * half-built compound neither hides nor reveals rows behind the user's back.
 */
export function buildFilterPlan(filters: Filter[]): FilterPlan {
  const byId = new Map(filters.map((f) => [f.id, f]))
  const position = new Map(filters.map((f, index) => [f.id, index + 1]))
  const issues = new Map<string, FilterIssueCode>()
  const nodes = new Map<string, FilterNode | null>()

  const fail = (id: string, code: FilterIssueCode): null => {
    // A cycle is the more precise diagnosis, and it is recorded first.
    if (!issues.has(id)) issues.set(id, code)
    nodes.set(id, null)
    return null
  }

  const build = (id: string, stack: string[]): FilterNode | null => {
    const seen = nodes.get(id)
    if (seen !== undefined) return seen

    const cycleStart = stack.indexOf(id)
    if (cycleStart !== -1) {
      // Every row from the first sighting on takes part in the cycle.
      for (const member of stack.slice(cycleStart)) issues.set(member, 'cycle')
      return null
    }

    const filter = byId.get(id)
    if (!filter) return null

    if (filter.type !== 'compound') {
      const leaf: FilterNode = { kind: 'leaf', filter }
      nodes.set(id, leaf)
      return leaf
    }

    if (filter.left === null || filter.right === null) return fail(id, 'unset-operand')
    if (!byId.has(filter.left) || !byId.has(filter.right)) return fail(id, 'missing-operand')

    const next = [...stack, id]
    const left = build(filter.left, next)
    const right = build(filter.right, next)
    if (!left || !right) return fail(id, 'broken-operand')

    const branch: FilterNode = { kind: 'branch', filter, left, right }
    nodes.set(id, branch)
    return branch
  }

  for (const filter of filters) build(filter.id, [])

  const consumed = new Map<string, string>()
  const fold = (node: FilterNode, ownerId: string): void => {
    if (!consumed.has(node.filter.id)) consumed.set(node.filter.id, ownerId)
    if (node.kind === 'branch') {
      fold(node.left, node.filter.id)
      fold(node.right, node.filter.id)
    }
  }

  for (const filter of filters) {
    if (filter.type !== 'compound' || !filter.enabled) continue
    const node = nodes.get(filter.id)
    if (!node || node.kind !== 'branch') continue
    fold(node.left, filter.id)
    fold(node.right, filter.id)
  }

  const roots = filters
    .filter((f) => f.enabled && !consumed.has(f.id))
    .map((f) => nodes.get(f.id) ?? null)
    .filter((n): n is FilterNode => n !== null)

  return { roots, consumed, issues, position }
}

/** Runs one tree against a row. Leaves keep the "cannot evaluate → keep the row" rule. */
export function evaluateNode(node: FilterNode, row: Row, i: number, columns: Column[]): boolean {
  if (node.kind === 'leaf') return passesFilter(node.filter, row, i, columns)

  const left = evaluateNode(node.left, row, i, columns)
  const settled = settleOnLeft(node.filter.cop, left)
  if (settled !== null) return settled

  return combine(node.filter.cop, left, evaluateNode(node.right, row, i, columns))
}

/** The result when the left side alone decides it, so the right side can be skipped. */
function settleOnLeft(op: BoolOp, left: boolean): boolean | null {
  switch (op) {
    case 'AND':
      return left ? null : false
    case 'NAND':
      return left ? null : true
    case 'OR':
      return left ? true : null
    case 'NOR':
      return left ? false : null
    case 'IMPLIES':
      return left ? null : true
    // XOR and XNOR always need both sides.
    default:
      return null
  }
}

function combine(op: BoolOp, a: boolean, b: boolean): boolean {
  switch (op) {
    case 'AND':
      return a && b
    case 'OR':
      return a || b
    case 'XOR':
      return a !== b
    case 'NAND':
      return !(a && b)
    case 'NOR':
      return !(a || b)
    case 'XNOR':
      return a === b
    // Material implication: passes unless the left side holds and the right does not.
    case 'IMPLIES':
      return !a || b
  }
}

/** The applied predicates as an expression, e.g. `(#1 OR #2) AND #4`. */
export function describePlan(plan: FilterPlan): string {
  return plan.roots.map((node) => describeNode(node, plan.position)).join(' AND ')
}

function describeNode(node: FilterNode, position: Map<string, number>): string {
  const label = `#${position.get(node.filter.id) ?? '?'}`
  if (node.kind === 'leaf') return label
  return `(${describeNode(node.left, position)} ${node.filter.cop} ${describeNode(node.right, position)})`
}
