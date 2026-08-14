/** Flattens a value to the plain string used for search, filters, joins and CSV. */
export function toSearchText(v: unknown): string {
  if (v === null || v === undefined) return ''
  if (typeof v === 'object') return safeStringify(v)
  return String(v)
}

export function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v) ?? String(v)
  } catch {
    return '[object]'
  }
}
