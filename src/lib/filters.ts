import type { BoolOp, Column, Filter, FilterOp, Row } from '../types/workbench'
import { cellValue, toSearchText } from './cell'
import { evaluate } from './expression'
import { createId } from './id'

export interface FilterOpOption {
  id: FilterOp
  name: string
}

export const FILTER_OPS: FilterOpOption[] = [
  { id: 'contains', name: 'contains' },
  { id: 'ncontains', name: "doesn't contain" },
  { id: 'eq', name: 'is' },
  { id: 'ne', name: 'is not' },
  { id: 'gt', name: '>' },
  { id: 'gte', name: '≥' },
  { id: 'lt', name: '<' },
  { id: 'lte', name: '≤' },
  { id: 'empty', name: 'is empty' },
  { id: 'nempty', name: 'is not empty' },
  { id: 'regex', name: 'matches /re/' },
]

export interface BoolOpOption {
  id: BoolOp
  name: string
}

export const BOOL_OPS: BoolOpOption[] = [
  { id: 'AND', name: 'AND' },
  { id: 'OR', name: 'OR' },
  { id: 'XOR', name: 'XOR' },
  { id: 'NAND', name: 'NAND' },
  { id: 'NOR', name: 'NOR' },
  { id: 'XNOR', name: 'XNOR' },
  { id: 'IMPLIES', name: 'IMPLIES' },
]

/** Connectives renamed since they were first saved. */
const BOOL_OP_ALIASES: Record<string, BoolOp> = { THEREFORE: 'IMPLIES' }

/**
 * A saved connective, mapped through any rename. An unreadable one falls back to
 * AND rather than reaching the evaluator, where an unknown connective would be
 * neither true nor false.
 */
export function normalizeBoolOp(value: unknown): BoolOp {
  if (typeof value !== 'string') return 'AND'
  const name = BOOL_OP_ALIASES[value] ?? value
  return BOOL_OPS.some((op) => op.id === name) ? (name as BoolOp) : 'AND'
}

/** Ops that ignore the value input. */
const VALUELESS_OPS: FilterOp[] = ['empty', 'nempty']

export function isValuelessOp(op: FilterOp): boolean {
  return VALUELESS_OPS.includes(op)
}

/**
 * A filter that cannot be evaluated (unknown column, broken regex, throwing
 * expression) keeps the row: a half-typed filter should not hide data.
 */
export function passesFilter(filter: Filter, row: Row, i: number, columns: Column[]): boolean {
  if (filter.type === 'compound') return true

  if (filter.type === 'custom') {
    const result = evaluate(filter.code, row, i)
    return Boolean(result)
  }

  const col = columns.find((c) => c.id === filter.colId)
  if (!col) return true

  const value = cellValue(col, row, i)
  const text = toSearchText(value)
  const num = typeof value === 'number' ? value : Number.parseFloat(text)
  const target = filter.value ?? ''
  const targetNum = Number.parseFloat(target)

  switch (filter.op) {
    case 'contains':
      return text.toLowerCase().includes(target.toLowerCase())
    case 'ncontains':
      return !text.toLowerCase().includes(target.toLowerCase())
    case 'eq':
      return text.toLowerCase() === target.toLowerCase()
    case 'ne':
      return text.toLowerCase() !== target.toLowerCase()
    case 'gt':
      return isComparable(num, targetNum) && num > targetNum
    case 'gte':
      return isComparable(num, targetNum) && num >= targetNum
    case 'lt':
      return isComparable(num, targetNum) && num < targetNum
    case 'lte':
      return isComparable(num, targetNum) && num <= targetNum
    case 'empty':
      return text === ''
    case 'nempty':
      return text !== ''
    case 'regex':
      try {
        return new RegExp(target, 'i').test(text)
      } catch {
        return true
      }
    default:
      return true
  }
}

function isComparable(a: number, b: number): boolean {
  return !Number.isNaN(a) && !Number.isNaN(b)
}

/** A filter row as it may sit in localStorage, from this shape or the one before it. */
interface SavedFilter {
  id?: string
  type?: string
  /** Pre-panel rows were tagged `kind: 'col' | 'js'` and had no on/off flag. */
  kind?: string
  enabled?: boolean
  colId?: string
  op?: FilterOp
  value?: string
  code?: string
  /** An operand id, or a 1-based row number from before ids were stored. */
  left?: unknown
  cop?: unknown
  right?: unknown
}

/** Upgrades one saved row; positional operands are re-pointed by normalizeFilters. */
function normalizeFilter(input: unknown): Filter | null {
  if (!input || typeof input !== 'object') return null
  const saved = input as SavedFilter
  const id = saved.id ?? createId()
  const type = saved.type ?? (saved.kind === 'js' ? 'custom' : 'simple')
  // Rows saved before the flag existed were being applied, so they stay applied.
  const enabled = saved.enabled !== false

  if (type === 'custom') return { id, type, enabled, code: saved.code ?? '' }
  if (type === 'compound') {
    return {
      id,
      type,
      enabled,
      left: operandId(saved.left),
      cop: normalizeBoolOp(saved.cop),
      right: operandId(saved.right),
    }
  }
  return {
    id,
    type: 'simple',
    enabled,
    colId: saved.colId ?? '',
    op: saved.op ?? 'contains',
    value: saved.value ?? '',
  }
}

export function normalizeFilters(input: unknown): Filter[] {
  if (!Array.isArray(input)) return []

  const rows = input
    .map((saved) => ({ saved: saved as SavedFilter, filter: normalizeFilter(saved) }))
    .filter((row): row is { saved: SavedFilter; filter: Filter } => row.filter !== null)
  const ids = rows.map((row) => row.filter.id)

  // Compounds saved by position are re-pointed at the ids in those slots.
  return rows.map(({ saved, filter }) =>
    filter.type === 'compound'
      ? { ...filter, left: byPosition(saved.left, ids) ?? filter.left, right: byPosition(saved.right, ids) ?? filter.right }
      : filter,
  )
}

/** Only a string is an operand id; anything else leaves the operand unset. */
function operandId(value: unknown): string | null {
  return typeof value === 'string' && value !== '' ? value : null
}

function byPosition(value: unknown, ids: string[]): string | null {
  if (typeof value !== 'number' || !Number.isInteger(value)) return null
  return ids[value - 1] ?? null
}
