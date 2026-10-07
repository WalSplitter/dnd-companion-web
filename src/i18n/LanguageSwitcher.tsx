import { useI18n, type Lang } from './useI18n'

const LANGS: { key: Lang; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'de', label: 'DE' },
]

/**
 * EN | DE. `collapsible` (in Owlbear's narrow panel): below a container width only the current
 * language shows, and a click on it switches to the other — see the header in `App.tsx`.
 */
export function LanguageSwitcher({ collapsible = false }: { collapsible?: boolean }) {
  const { lang, setLang, t } = useI18n()
  const other = LANGS.find((l) => l.key !== lang)!.key

  return (
    <div
      className="flex shrink-0 items-center gap-1 rounded-full border border-trim/25 bg-surface p-1"
      role="group"
      aria-label={t('language.ariaLabel')}
    >
      {LANGS.map((l) => (
        <button
          key={l.key}
          type="button"
          // Collapsed, the current language is the only button — it switches to the other.
          onClick={(e) => setLang(lang === l.key && collapsible && isCollapsed(e.currentTarget) ? other : l.key)}
          aria-pressed={lang === l.key}
          className={`h-7 min-w-7 rounded-full px-2 text-xs font-semibold transition ${
            lang === l.key ? 'bg-trim/15 text-trim' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          } ${collapsible && lang !== l.key ? '@max-[26rem]:hidden' : ''}`}
        >
          {l.label}
        </button>
      ))}
    </div>
  )
}

/** Whether the other language's button is hidden, i.e. the switcher shows the current one only. */
function isCollapsed(button: HTMLElement): boolean {
  return [...(button.parentElement?.children ?? [])].some((sibling) => sibling !== button && getComputedStyle(sibling).display === 'none')
}
