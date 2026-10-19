/**
 * `localStorage` for per-device preferences that the app works fine without: storage may be blocked
 * (private mode, an iframe's third-party context) or full, and then a choice simply isn't remembered.
 * Reads give `null` and writes do nothing instead of throwing.
 */

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

/** A stored JSON value — `undefined` when missing, unreadable or garbled. */
export function readStoredJson(key: string): unknown {
  const raw = readStored(key)
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return undefined
  }
}

export function writeStored(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Not remembered beyond this visit then.
  }
}

export function writeStoredJson(key: string, value: unknown): void {
  writeStored(key, JSON.stringify(value))
}
