import { de } from '../i18n/de'
import { en } from '../i18n/en'
import { detectLang } from '../i18n/detectLang'

export type Dictionary = Record<keyof typeof en, string>

/**
 * The dictionary of Owlbear's small pages (the toolbar popover, the minimized button), in the language
 * the app chose. The dictionaries directly, not via `useI18n`, which would pull React into them.
 */
export function pageDictionary(): Dictionary {
  return detectLang() === 'de' ? de : en
}

/** `dictionary[key]` with `{{name}}` placeholders filled in. */
export function translate(dictionary: Dictionary, key: keyof Dictionary, values: Record<string, string | number> = {}): string {
  return dictionary[key].replace(/\{\{(\w+)\}\}/g, (_, name: string) => String(values[name] ?? ''))
}
