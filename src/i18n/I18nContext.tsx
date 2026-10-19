import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { DICTIONARIES, I18nContext, interpolate, type I18nContextValue, type Lang } from './useI18n'
import { detectLang, storeLang } from './detectLang'


export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang)

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    storeLang(next)
  }, [])

  // Keeps <html lang> in step so the browser hyphenates (and screen readers pronounce) in that language.
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<I18nContextValue>(() => {
    const dict = DICTIONARIES[lang]
    return { lang, setLang, t: (key, vars) => interpolate(dict[key], vars) }
  }, [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}
