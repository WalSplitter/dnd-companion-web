import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { CharacterCard } from '../features/character-list/CharacterCard'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'

export function CharacterListPage() {
  const t = useT()
  const characters = useVaultStore((s) => s.vault.characters)

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterList.emptyBefore')} <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code>{' '}
        {t('characterList.emptyAfter')}
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold text-fg">{t('characterList.title')}</h1>
        <span className="text-sm text-fg-muted">{characters.length}</span>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {characters.map((c, i) => (
          <Link
            key={c.path}
            to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
            className="rise-in block"
            style={{ '--i': i } as CSSProperties}
          >
            <CharacterCard character={c.frontmatter} />
          </Link>
        ))}
      </div>
    </div>
  )
}
