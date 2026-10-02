import type { ReactNode } from 'react'
import { useT } from '../../i18n/useI18n'
import { AUTO_LIST_FROM, type CharacterLayout, type CharacterViewMode } from './viewMode'

const GridIcon = () => (
  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
    <rect x="2" y="2" width="5" height="5" rx="1" />
    <rect x="9" y="2" width="5" height="5" rx="1" />
    <rect x="2" y="9" width="5" height="5" rx="1" />
    <rect x="9" y="9" width="5" height="5" rx="1" />
  </svg>
)

const ListIcon = () => (
  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
    <rect x="2" y="2.5" width="12" height="3" rx="1" />
    <rect x="2" y="6.5" width="12" height="3" rx="1" />
    <rect x="2" y="10.5" width="12" height="3" rx="1" />
  </svg>
)

const LineupIcon = () => (
  <svg aria-hidden viewBox="0 0 16 16" className="size-3.5" fill="currentColor">
    <circle cx="3.5" cy="5" r="1.8" />
    <circle cx="8" cy="4.2" r="2.1" />
    <circle cx="12.5" cy="5" r="1.8" />
    <path d="M0.8 12.5c0-2 1.2-3.6 2.7-3.6s2.7 1.6 2.7 3.6Z" />
    <path d="M4.9 12.5c0-2.4 1.4-4.2 3.1-4.2s3.1 1.8 3.1 4.2Z" />
    <path d="M9.8 12.5c0-2 1.2-3.6 2.7-3.6s2.7 1.6 2.7 3.6Z" />
  </svg>
)

/** Auto / cards / list / lineup switch in the style of the language switcher. In auto mode the button also
 * shows which layout it picked, so the choice never looks arbitrary. */
export function ViewModeToggle({
  mode,
  layout,
  onChange,
}: {
  mode: CharacterViewMode
  layout: CharacterLayout
  onChange: (mode: CharacterViewMode) => void
}) {
  const t = useT()
  const options: { key: CharacterViewMode; title: string; content: ReactNode }[] = [
    {
      key: 'auto',
      title: t('characterList.viewAutoHint', { count: AUTO_LIST_FROM }),
      content: (
        <>
          {t('characterList.viewAuto')}
          {mode === 'auto' && <span className="opacity-70">{layout === 'list' ? <ListIcon /> : <GridIcon />}</span>}
        </>
      ),
    },
    { key: 'cards', title: t('characterList.viewCards'), content: <GridIcon /> },
    { key: 'list', title: t('characterList.viewList'), content: <ListIcon /> },
    { key: 'lineup', title: t('characterList.viewLineup'), content: <LineupIcon /> },
  ]

  return (
    <div className="flex items-center gap-1 rounded-full border border-trim/25 bg-surface p-1" role="group" aria-label={t('characterList.viewAriaLabel')}>
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={mode === o.key}
          aria-label={o.title}
          title={o.title}
          className={`flex h-7 min-w-7 cursor-pointer items-center justify-center gap-1 rounded-full px-2 text-xs font-semibold transition ${
            mode === o.key ? 'bg-trim/15 text-trim' : 'text-fg-muted hover:bg-surface-2 hover:text-fg'
          }`}
        >
          {o.content}
        </button>
      ))}
    </div>
  )
}
