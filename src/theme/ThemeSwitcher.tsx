import { useEffect } from 'react'
import { useT, type TranslationKey } from '../i18n/I18nContext'
import { THEMES, useThemeStore } from './themeStore'

/** Mounted once near the app root: syncs the persisted theme onto `<html data-theme>`. */
export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return null
}

export function ThemeSwitcher() {
  const translate = useT()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
      {THEMES.map((entry) => {
        const label = translate(`theme.${entry.key}` as TranslationKey)
        return (
          <button
            key={entry.key}
            type="button"
            onClick={() => setTheme(entry.key)}
            title={label}
            aria-label={`${label} ${translate('theme.ariaLabelSuffix')}`}
            aria-pressed={theme === entry.key}
            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
              theme === entry.key ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <span
              className="h-4 w-4 rounded-full"
              style={{ backgroundColor: entry.swatch, border: entry.swatchBorder ? `1px solid ${entry.swatchBorder}` : undefined }}
            />
          </button>
        )
      })}
    </div>
  )
}
