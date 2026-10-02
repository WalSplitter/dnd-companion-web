import { isRecord } from '../frontmatterFields'
import type { AppearanceKey, CharacterBiography } from '../types'

/**
 * Reads a character's roleplay details for the "Biography" tab. Everything is optional and both
 * spellings are understood, since the Endeavour character note is still taking shape:
 *
 * - the app's own schema: `personality` (a list or a text), `ideals`, `bonds`, `flaws`, and
 *   `appearance` (a text, or a map like `{ age: 41, eyes: grau }`);
 * - the older German character sheets' blocks: `Persönlichkeit` (`Persönlichkeitsmerkmale` as a
 *   list, `Ideale`, `Bindungen`, `Makel`) and `Aussehen` (`Geschlecht`, `Alter`, `Größe`, …) — what
 *   the vault's `embed Character Sheet Background` renders.
 *
 * A simplified sheet can just write `Persönlichkeit:` or `Aussehen:` as a plain text.
 */
export function resolveBiography(data: Record<string, unknown>): CharacterBiography | undefined {
  const persona = isRecord(data.Persönlichkeit) ? data.Persönlichkeit : undefined
  const biography: CharacterBiography = {
    personality: textList(data.personality ?? persona?.Persönlichkeitsmerkmale ?? (persona ? undefined : data.Persönlichkeit)),
    ideals: text(data.ideals ?? persona?.Ideale),
    bonds: text(data.bonds ?? persona?.Bindungen),
    flaws: text(data.flaws ?? persona?.Makel),
    ...appearance(data.appearance ?? data.Aussehen),
  }
  const present = Object.values(biography).some((v) => v !== undefined)
  return present ? biography : undefined
}

/** Appearance keys in both spellings, mapped to the labels the tab shows (in the order it shows them). */
const APPEARANCE_KEYS: Record<string, AppearanceKey> = {
  gender: 'gender',
  geschlecht: 'gender',
  age: 'age',
  alter: 'age',
  size: 'size',
  größenkategorie: 'size',
  height: 'height',
  größe: 'height',
  weight: 'weight',
  gewicht: 'weight',
  eyes: 'eyes',
  augenfarbe: 'eyes',
  hair: 'hair',
  haarfarbe: 'hair',
  skin: 'skin',
  hautfarbe: 'skin',
}

function appearance(value: unknown): Pick<CharacterBiography, 'appearance' | 'appearance_text'> {
  const asText = text(value)
  if (asText) return { appearance_text: asText }
  if (!isRecord(value)) return {}
  const entries = Object.entries(value)
    .map(([key, raw]): { key: string; value: string | undefined } => ({ key: APPEARANCE_KEYS[key.trim().toLowerCase()] ?? key, value: text(raw) }))
    .filter((e): e is { key: string; value: string } => e.value !== undefined)
  const order = Object.values(APPEARANCE_KEYS)
  // Known fields in a fixed order, then anything else in the note's own order.
  entries.sort((a, b) => rank(order, a.key) - rank(order, b.key))
  return entries.length > 0 ? { appearance: entries } : {}
}

function rank(order: string[], key: string): number {
  const i = order.indexOf(key)
  return i === -1 ? order.length : i
}

/** A non-empty trimmed string; numbers (an age of 41) count too. */
function text(value: unknown): string | undefined {
  if (typeof value === 'number') return String(value)
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

/** A list of texts, or a single text as a one-item list; empty entries (unfilled template rows) are dropped. */
function textList(value: unknown): string[] | undefined {
  const items = Array.isArray(value) ? value.map(text) : [text(value)]
  const filled = items.filter((v): v is string => v !== undefined)
  return filled.length > 0 ? filled : undefined
}
