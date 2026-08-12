let counter = 0

/** Short, collision-resistant enough id for client-only entities. */
export function createId(): string {
  counter += 1
  return Math.random().toString(36).slice(2, 9) + counter.toString(36)
}
