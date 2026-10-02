import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CharacterCard, CharacterRow } from '../features/character-list/CharacterCard'
import { PartyRadar } from '../features/character-list/AttributeRadar'
import { PartyFormation } from '../features/character-list/CharacterLineup'
import { resolveLayout, useCharacterViewMode, type CharacterLayout } from '../features/character-list/viewMode'
import { ViewModeToggle } from '../features/character-list/ViewModeToggle'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'

const CONTAINER: Record<Exclude<CharacterLayout, 'lineup'>, string> = {
  cards: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  list: 'flex flex-col gap-2',
}

export function CharacterListPage() {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)
  const [mode, setMode] = useCharacterViewMode()
  const layout = resolveLayout(mode, characters.length)
  // The tab lives in the URL so "back" from a sheet returns to the comparison.
  const [searchParams, setSearchParams] = useSearchParams()
  const comparing = searchParams.get('tab') === 'compare'

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterList.emptyBefore')} <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code>{' '}
        {t('characterList.emptyAfter')}
      </div>
    )
  }

  const tabs = [
    { key: 'party', label: t('characterList.tabParty'), active: !comparing },
    { key: 'compare', label: t('characterList.tabCompare'), active: comparing },
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">
          {t('characterList.title')} <span className="ml-1 text-sm font-normal text-fg-muted">{characters.length}</span>
        </h1>
        {!comparing && <ViewModeToggle mode={mode} layout={layout} onChange={setMode} />}
      </div>

      <div role="tablist" className="mb-4 flex gap-1 whitespace-nowrap border-b border-trim/25">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={tab.active}
            onClick={() => setSearchParams(tab.key === 'compare' ? { tab: 'compare' } : {}, { replace: true })}
            className="rpg-tab cursor-pointer"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {comparing ? (
        <PartyRadar characters={characters} />
      ) : layout === 'lineup' ? (
        <PartyFormation characters={characters} />
      ) : (
        <div className={CONTAINER[layout]}>
          {characters.map((c, i) => (
            <Link
              key={c.path}
              to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
              className="rise-in block"
              style={{ '--i': i } as CSSProperties}
            >
              {layout === 'list' ? <CharacterRow character={c.frontmatter} /> : <CharacterCard character={c.frontmatter} />}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
