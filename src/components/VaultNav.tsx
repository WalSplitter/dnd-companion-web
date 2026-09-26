import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useMatch, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { classSummary } from '../vault/deriveStats'
import type { CharacterFrontmatter } from '../vault/types'
import { ArcaneSigil } from './ArcaneSigil'

function characterPath(name: string) {
  return `/characters/${encodeURIComponent(name)}`
}

function Avatar({ character, size = 'size-6' }: { character: CharacterFrontmatter; size?: string }) {
  return character.portrait_url ? (
    <img src={character.portrait_url} alt="" className={`${size} shrink-0 rounded-full border border-trim/60 object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full border border-trim/60 bg-surface-2 font-display text-[0.6rem] font-bold text-trim`}>
      {character.name.trim().charAt(0).toUpperCase()}
    </span>
  )
}

function Separator() {
  return <span aria-hidden className="vault-nav-sep mx-1 size-1.5 shrink-0 rotate-45 border border-trim/50" />
}

const CRUMB = 'vault-nav-crumb inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1 transition'

function Crumb({ to, current, children }: { to: string; current: boolean; children: ReactNode }) {
  return current ? (
    <span aria-current="page" className={`${CRUMB} font-semibold text-fg`}>
      {children}
    </span>
  ) : (
    <Link to={to} className={`${CRUMB} text-fg-muted hover:bg-trim/10 hover:text-fg`}>
      {children}
    </Link>
  )
}

/** The current character's crumb: opens a list of every character in the vault to jump between sheets. */
function CharacterSwitcher({ current, characters }: { current: CharacterFrontmatter; characters: CharacterFrontmatter[] }) {
  const t = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        title={t('nav.switchCharacter')}
        onClick={() => setOpen((o) => !o)}
        className={`${CRUMB} max-w-full font-semibold text-fg hover:bg-trim/10`}
      >
        <Avatar character={current} />
        <span className="truncate">{current.name}</span>
        <svg viewBox="0 0 12 12" className={`size-3 shrink-0 text-trim transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label={t('nav.switchCharacter')} className="vault-nav-menu absolute left-0 top-full z-20 mt-2 w-72 max-w-[80vw] overflow-hidden rounded-xl p-1.5">
          {characters.map((c) => {
            const selected = c.name === current.name
            return (
              <li key={c.name} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    if (!selected) navigate(characterPath(c.name))
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${selected ? 'bg-trim/15' : 'hover:bg-trim/10'}`}
                >
                  <Avatar character={c} size="size-8" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{c.name}</span>
                    <span className="block truncate text-xs text-fg-muted">{classSummary(c)}</span>
                  </span>
                  {selected && <span aria-hidden className="size-1.5 rotate-45 bg-trim" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StepButton({ to, label, children }: { to: string; label: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      title={label}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-full border border-trim/25 text-fg-muted transition hover:border-trim/60 hover:bg-trim/10 hover:text-trim"
    >
      {children}
    </Link>
  )
}

/**
 * Breadcrumb bar above every vault page: Start › vault (character list) › character. On a sheet the
 * last crumb switches characters, and the arrows on the right step through the party.
 */
export function VaultNav() {
  const t = useT()
  const source = useVaultStore((s) => s.source)
  const vaultName = useVaultStore((s) => s.vaultName)
  const characters = useVaultStore((s) => s.vault.characters)
  const sheetMatch = useMatch('/characters/:characterName')
  const currentName = sheetMatch?.params.characterName
  const currentIndex = currentName ? characters.findIndex((c) => c.frontmatter.name === currentName) : -1
  const current = currentIndex >= 0 ? characters[currentIndex].frontmatter : null
  const step = (delta: number) => characters[(currentIndex + delta + characters.length) % characters.length].frontmatter.name

  return (
    <nav aria-label={t('nav.ariaLabel')} className="vault-nav mb-5 flex items-center gap-2 rounded-full border border-trim/20 px-1.5 py-1.5 text-sm">
      <ol className="flex min-w-0 flex-1 items-center">
        <li className="shrink-0">
          <Link to="/" className={`${CRUMB} group text-fg-muted hover:bg-trim/10 hover:text-fg`}>
            <ArcaneSigil className="vault-nav-home size-5" />
            <span className="hidden sm:inline">{t('nav.start')}</span>
          </Link>
        </li>
        <li className="flex min-w-0 shrink items-center">
          <Separator />
          <Crumb to="/characters" current={!current}>
            <svg viewBox="0 0 24 24" className="size-4 shrink-0 text-trim" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
              <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10l2 2.5h6.5A1.5 1.5 0 0 1 20 8v10.5a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5Z" />
            </svg>
            <span className="truncate">{source === 'sample' ? t('vaultLoader.sampleData') : vaultName}</span>
            <span className="hidden shrink-0 text-fg-muted/70 md:inline">· {t('nav.characters')}</span>
          </Crumb>
        </li>
        {current && (
          <li className="vault-nav-enter flex min-w-0 items-center">
            <Separator />
            <CharacterSwitcher current={current} characters={characters.map((c) => c.frontmatter)} />
          </li>
        )}
      </ol>

      {current && characters.length > 1 && (
        <div className="flex shrink-0 items-center gap-1.5 pr-1">
          <StepButton to={characterPath(step(-1))} label={step(-1)}>
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M7.5 2.5 4 6l3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StepButton>
          <span className="hidden font-num text-xs text-fg-muted sm:inline">
            {currentIndex + 1}/{characters.length}
          </span>
          <StepButton to={characterPath(step(1))} label={step(1)}>
            <svg viewBox="0 0 12 12" className="size-3" aria-hidden>
              <path d="M4.5 2.5 8 6 4.5 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </StepButton>
        </div>
      )}
    </nav>
  )
}
