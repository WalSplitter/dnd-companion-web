import { Link } from 'react-router-dom'
import { useT } from '../i18n/I18nContext'
import { useVaultStore } from '../store/vaultStore'
import { classSummary } from '../vault/deriveStats'

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
      <h1 className="mb-4 text-2xl font-semibold text-fg">{t('characterList.title')}</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <Link
            key={c.path}
            to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            {c.frontmatter.portrait_url && (
              <img
                src={c.frontmatter.portrait_url}
                alt=""
                className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
              />
            )}
            <div className="min-w-0">
              <div className="text-lg font-semibold text-fg">{c.frontmatter.name}</div>
              <div className="mt-1 text-sm text-fg-muted">{classSummary(c.frontmatter)}</div>
              <div className="mt-1 text-sm text-fg-muted">
                {c.frontmatter.species} · {c.frontmatter.background}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
