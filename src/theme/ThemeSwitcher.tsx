import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

/** Collapsed to a single swatch button showing the active theme — clicking it opens a flyout with
 * the rest, instead of always showing all eight dots in the header. */
export function ThemeSwitcher() {
  const translate = useT()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active = THEMES.find((t) => t.key === theme) ?? THEMES[0]

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
  }, [open])

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        title={translate(`theme.${active.key}` as TranslationKey)}
        aria-haspopup="true"
        aria-expanded={open}
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-trim/25 bg-surface transition ${
          open ? 'ring-2 ring-trim ring-offset-2 ring-offset-surface' : 'hover:border-trim/50'
        }`}
      >
        <span
          className="h-4 w-4 rounded-full"
          style={{ backgroundColor: active.swatch, border: active.swatchBorder ? `1px solid ${active.swatchBorder}` : undefined }}
        />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="rpg-panel fixed z-50 flex gap-1 p-1.5"
            style={{ top: coords.top, right: coords.right }}
          >
            {THEMES.map((entry) => {
              const label = translate(`theme.${entry.key}` as TranslationKey)
              return (
                <button
                  key={entry.key}
                  type="button"
                  role="menuitemradio"
                  aria-checked={theme === entry.key}
                  onClick={() => {
                    setTheme(entry.key)
                    setOpen(false)
                  }}
                  title={label}
                  aria-label={`${label} ${translate('theme.ariaLabelSuffix')}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                    theme === entry.key ? 'ring-2 ring-trim ring-offset-2 ring-offset-surface' : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: entry.swatch, border: entry.swatchBorder ? `1px solid ${entry.swatchBorder}` : undefined }}
                  />
                </button>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
