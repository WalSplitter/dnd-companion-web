import type { CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CampaignPanel } from '../features/campaign/CampaignPanel'
import { useUnseenCount } from '../features/campaign/useCampaign'
import { CharacterCard, CharacterRow } from '../features/character-list/CharacterCard'
import { ChroniclePanel } from '../features/character-list/ChroniclePanel'
import { PartyRadar } from '../features/character-list/PartyRadar'
import { PartyFormation } from '../features/character-list/CharacterLineup'
import { resolveLayout, useCharacterViewMode, type CharacterLayout } from '../features/character-list/viewMode'
import { ViewModeToggle } from '../features/character-list/ViewModeToggle'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import type { JournalEntry } from '../vault/types'
import { characterRoute } from './paths'

const CONTAINER: Record<Exclude<CharacterLayout, 'lineup'>, string> = {
  cards: 'grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3',
  list: 'flex flex-col gap-2',
}

const NO_ENTRIES: JournalEntry[] = []

export function CharacterListPage() {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)
  // The chronicle reads the repository's commit history, so it only exists for a GitHub vault.
  const hasHistory = useVaultStore((s) => s.github !== null)
  const [mode, setMode] = useCharacterViewMode()
  const layout = resolveLayout(mode, characters.length)
  // The tab lives in the URL so "back" from a sheet returns to the comparison.
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab = requested === 'compare' || requested === 'campaign' ? requested : requested === 'chronicle' && hasHistory ? 'chronicle' : 'party'
  const campaignEntries = useVaultStore((s) => s.vault.campaign?.entries)
  const unseen = useUnseenCount(campaignEntries ?? NO_ENTRIES)

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterList.emptyBefore')} <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code>{' '}
        {t('characterList.emptyAfter')}
      </div>
    )
  }

  const tabs = [
    { key: 'party', label: t('characterList.tabParty') },
    { key: 'campaign', label: t('campaign.tab'), badge: tab === 'campaign' ? 0 : unseen },
    { key: 'compare', label: t('characterList.tabCompare') },
    ...(hasHistory ? [{ key: 'chronicle', label: t('characterList.tabChronicle') }] : []),
  ]

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-fg">
          {t('characterList.title')} <span className="ml-1 text-sm font-normal text-fg-muted">{characters.length}</span>
        </h1>
        {tab === 'party' && <ViewModeToggle mode={mode} layout={layout} onChange={setMode} />}
      </div>

      <div role="tablist" className="mb-4 flex flex-wrap gap-1 whitespace-nowrap border-b border-trim/25">
        {tabs.map(({ key, label, badge }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setSearchParams(key === 'party' ? {} : { tab: key }, { replace: true })}
            className="rpg-tab cursor-pointer"
          >
            {label}
            {badge ? (
              <span className="campaign-tab-badge" title={t('campaign.unseen', { n: badge })}>
                {badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {tab === 'compare' ? (
        <PartyRadar characters={characters} />
      ) : tab === 'campaign' ? (
        <CampaignPanel />
      ) : tab === 'chronicle' ? (
        <ChroniclePanel />
      ) : layout === 'lineup' ? (
        <PartyFormation characters={characters} />
      ) : (
        <div className={CONTAINER[layout]}>
          {characters.map((c, i) => (
            <Link
              key={c.path}
              to={characterRoute(c.frontmatter.name)}
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
