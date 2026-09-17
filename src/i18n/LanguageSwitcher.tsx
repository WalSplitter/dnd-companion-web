import { useI18n, type Lang } from './I18nContext'

const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'de', label: 'DE' },
]

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n()

  return (
    <div
      className="flex items-center gap-1 rounded-full border border-border bg-surface p-1"
      role="group"
      aria-label={t('language.ariaLabel')}
    >
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          onClick={() => setLang(l.key)}
          aria-pressed={lang === l.key}
          className={`h-7 min-w-7 rounded-full px-2 text-xs font-semibold transition ${
            lang === l.key ? 'bg-primary text-primary-fg' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          }`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}
