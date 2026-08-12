import type { Column, Filter, FilterOp, Row } from '../types/workbench'
import { cellValue, toSearchText } from './cell'
import { evaluate } from './expression'
import { lastSegment } from './path'

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
  if (filter.kind === 'js') {
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

const CODE_LABEL_LIMIT = 34

/** Short human label for a filter pill. */
export function filterLabel(filter: Filter, columns: Column[]): string {
  if (filter.kind === 'js') {
    const code = filter.code
    return `js: ${code.length > CODE_LABEL_LIMIT ? `${code.slice(0, CODE_LABEL_LIMIT)}…` : code}`
  }
  const col = columns.find((c) => c.id === filter.colId)
  const op = FILTER_OPS.find((o) => o.id === filter.op)
  const name = col ? col.name || lastSegment(col.path ?? '') : '?'
  const suffix = isValuelessOp(filter.op) ? '' : ` ${filter.value}`
  return `${name} ${op ? op.name : filter.op}${suffix}`
}
