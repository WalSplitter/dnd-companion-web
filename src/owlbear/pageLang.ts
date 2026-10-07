import { de } from '../i18n/de'
import { en } from '../i18n/en'

/**
 * The language of Owlbear's small pages (the toolbar popover, the minimized button) — chosen as the
 * app chooses it. The dictionaries directly, not via `useI18n`, which would pull React into them.
 */
export function pageLang(): 'en' | 'de' {
  try {
    const stored = localStorage.getItem('dnd-companion-lang')
    if (stored === 'en' || stored === 'de') return stored
  } catch {
    // Fall back to the browser's language, as the app does.
  }
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

export type Dictionary = Record<keyof typeof en, string>

export function pageDictionary(): Dictionary {
  return pageLang() === 'de' ? de : en
}

/** `dictionary[key]` with `{{name}}` placeholders filled in. */
export function translate(dictionary: Dictionary, key: keyof Dictionary, values: Record<string, string | number> = {}): string {
  return dictionary[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''))
}
