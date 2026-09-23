import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { DICTIONARIES, I18nContext, interpolate, type I18nContextValue, type Lang } from './useI18n'

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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectDefaultLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Non-fatal — the choice just won't persist across reloads.
    }
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[lang]
    return { lang, setLang, t: (key, vars) => interpolate(dict[key], vars) }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
