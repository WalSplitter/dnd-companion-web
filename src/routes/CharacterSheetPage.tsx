import { Link, useParams } from 'react-router-dom'
import { useVaultStore } from '../store/vaultStore'
import { CharacterSheet } from '../features/character-sheet/CharacterSheet'

export function CharacterSheetPage() {
  const { characterName } = useParams<{ characterName: string }>()
  const character = useVaultStore((s) =>
    s.vault.characters.find((c) => c.frontmatter.name === decodeURIComponent(characterName ?? '')),
  )
  const index = useVaultStore((s) => s.index)

  if (!character) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        Character not found.{' '}
        <Link to="/" className="text-primary hover:underline">
          Back to character list
        </Link>
      </div>
    )
  }

  return <CharacterSheet character={character.frontmatter} index={index} body={character.body} />
}
