import { readStored, writeStored } from '../utils/storage'

const STORAGE_KEY = 'dnd-companion-lang'

/** The language chosen on this device, else the browser's — German for `de-*`, English otherwise.
 * React-free, so Owlbear's small pages (see `owlbear/pageLang.ts`) pick the same one as the app. */
export function detectLang(): 'en' | 'de' {
  const stored = readStored(STORAGE_KEY)
  if (stored === 'en' || stored === 'de') return stored
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export function storeLang(lang: 'en' | 'de'): void {
  writeStored(STORAGE_KEY, lang)
}
