import { useEffect } from 'react'
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
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)

  return (
    <div className="flex items-center gap-1 rounded-full border border-border bg-surface p-1">
      {THEMES.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTheme(t.key)}
          title={t.label}
          aria-label={`${t.label} theme`}
          aria-pressed={theme === t.key}
          className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
            theme === t.key ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'
          }`}
        >
          <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.swatch }} />
        </button>
      ))}
    </div>
  )
}
