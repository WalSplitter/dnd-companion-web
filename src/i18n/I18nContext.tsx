import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { de } from './de'
import { en } from './en'

export type Lang = 'en' | 'de'
export type TranslationKey = keyof typeof en

const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { en, de }

const STORAGE_KEY = 'dnd-companion-lang'

function detectDefaultLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'en' || stored === 'de') return stored
  } catch {
    // localStorage unavailable (private mode, ...) — fall through to browser language detection.
  }
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function interpolate(template: string, vars: Record<string, string | number> | undefined): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDefaultLang)

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[lang]
    return {
      lang,
      setLang: (next: Lang) => {
        setLangState(next)
        try {
          localStorage.setItem(STORAGE_KEY, next)
        } catch {
          // Non-fatal — the choice just won't persist across reloads.
        }
      },
      t: (key, vars) => interpolate(dict[key], vars),
    }
  }, [lang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

/** Convenience for components that only need the translate function, not the language itself. */
export function useT(): I18nContextValue['t'] {
  return useI18n().t
}
