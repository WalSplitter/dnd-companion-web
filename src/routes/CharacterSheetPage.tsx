import { Link, useParams } from 'react-router-dom'
import { useT } from '../i18n/I18nContext'
import { useVaultStore } from '../store/vaultStore'
import { CharacterSheet } from '../features/character-sheet/CharacterSheet'

export function CharacterSheetPage() {
  const t = useT()
  const { characterName } = useParams<{ characterName: string }>()
  const character = useVaultStore((s) =>
    s.vault.characters.find((c) => c.frontmatter.name === decodeURIComponent(characterName ?? '')),
  )
  const index = useVaultStore((s) => s.index)

  if (!character) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterSheet.notFound')}{' '}
        <Link to="/" className="text-primary hover:underline">
          {t('characterSheet.backToList')}
        </Link>
      </div>
    )
  }

  return <CharacterSheet character={character.frontmatter} characterPath={character.path} index={index} body={character.body} />
}
