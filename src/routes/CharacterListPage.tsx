import { Link } from 'react-router-dom'
import { useVaultStore } from '../store/vaultStore'
import { classSummary } from '../vault/deriveStats'

export function CharacterListPage() {
  const characters = useVaultStore((s) => s.vault.characters)

  if (characters.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        No characters found in this vault. Open a vault folder that contains files with{' '}
        <code className="rounded bg-surface-2 px-1 py-0.5">type: character</code> frontmatter.
      </div>
    )
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-semibold text-fg">Characters</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {characters.map((c) => (
          <Link
            key={c.path}
            to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="text-lg font-semibold text-fg">{c.frontmatter.name}</div>
            <div className="mt-1 text-sm text-fg-muted">{classSummary(c.frontmatter)}</div>
            <div className="mt-1 text-sm text-fg-muted">
              {c.frontmatter.species} · {c.frontmatter.background}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
