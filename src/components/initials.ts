/** Monogram for a name without a portrait: the first letters of its first two words ("Borin Eisenfaust" → "BE"). */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase()
}
