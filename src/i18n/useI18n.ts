import { createContext, useContext } from 'react'
import { de } from './de'
import { en } from './en'

export type Lang = 'en' | 'de'
export type TranslationKey = keyof typeof en
export type TranslateFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

export const DICTIONARIES: Record<Lang, Record<TranslationKey, string>> = { en, de }

export interface I18nContextValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: TranslateFn
}

export const I18nContext = createContext<I18nContextValue | null>(null)

export function interpolate(template: string, vars: Record<string, string | number> | undefined): string {
  if (!vars) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within an I18nProvider')
  return ctx
}

/** Convenience for components that only need the translate function, not the language itself. */
export function useT(): TranslateFn {
  return useI18n().t
}
