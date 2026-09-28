import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { createPortal } from 'react-dom'
import { useT, type TranslationKey } from '../i18n/useI18n'
import { isTopicTheme, THEMES, TOPIC_THEMES, useThemeStore, type ThemeEntry, type TopicThemeName } from './themeStore'
import { BlossomIcon, DragonIcon, EyeIcon, FirTreeIcon, HornIcon, PumpkinIcon, SkullIcon, SparklesIcon, SunIcon, type IconProps } from './topicIcons'

const TOPIC_ICONS: Record<TopicThemeName, ComponentType<IconProps>> = {
  necromancer: SkullIcon,
  shadowmaster: EyeIcon,
  dragon: DragonIcon,
  unicorn: HornIcon,
  halloween: PumpkinIcon,
  christmas: FirTreeIcon,
  summer: SunIcon,
  spring: BlossomIcon,
}

/** Mounted once near the app root: syncs the persisted theme onto `<html data-theme>`, plus
 * `data-theme-kind="topic"` for topic themes (their extra chrome in `topics.css` keys off it). */
export function ThemeEffect() {
  const theme = useThemeStore((s) => s.theme)

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    root.setAttribute('data-theme-kind', isTopicTheme(theme) ? 'topic' : 'color')
  }, [theme])

  return null
}

/** A colour theme's dot, or a topic theme's icon — both in the theme's own swatch colour. */
function ThemeSwatch({ entry }: { entry: ThemeEntry }) {
  if (isTopicTheme(entry.key)) {
    const Icon = TOPIC_ICONS[entry.key]
    return (
      <span style={{ color: entry.swatch }}>
        <Icon className="h-[18px] w-[18px]" />
      </span>
    )
  }
  return (
    <span
      className="h-4 w-4 rounded-full"
      style={{ backgroundColor: entry.swatch, border: entry.swatchBorder ? `1px solid ${entry.swatchBorder}` : undefined }}
    />
  )
}

/** Collapsed to a single swatch button showing the active theme — clicking it opens a flyout with
 * the colour themes in one row and the topic themes (plus their effects toggle) below. */
export function ThemeSwitcher() {
  const translate = useT()
  const theme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const effects = useThemeStore((s) => s.effects)
  const setEffects = useThemeStore((s) => s.setEffects)
  const [open, setOpen] = useState(false)
  const [coords, setCoords] = useState({ top: 0, right: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const active: ThemeEntry = [...THEMES, ...TOPIC_THEMES].find((t) => t.key === theme) ?? THEMES[0]

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

  function renderOption(entry: ThemeEntry) {
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
        <ThemeSwatch entry={entry} />
      </button>
    )
  }

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
        <ThemeSwatch entry={active} />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="rpg-panel no-topic-corners fixed z-50 flex flex-col gap-1.5 p-1.5"
            style={{ top: coords.top, right: coords.right }}
          >
            <div className="flex gap-1">{THEMES.map(renderOption)}</div>
            <div className="mx-1 h-px bg-trim/20" aria-hidden />
            <div className="flex items-center gap-1">
              {TOPIC_THEMES.map(renderOption)}
              <span className="flex-1" />
              <button
                type="button"
                role="menuitemcheckbox"
                aria-checked={effects}
                onClick={() => setEffects(!effects)}
                title={translate('theme.effects')}
                aria-label={translate('theme.effects')}
                className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
                  effects ? 'bg-trim/15 text-trim' : 'text-fg-muted opacity-60 hover:opacity-100'
                }`}
              >
                <SparklesIcon />
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
