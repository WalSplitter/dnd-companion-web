import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { CharacterSheet } from '../features/character-sheet/CharacterSheet'

export function CharacterSheetPage() {
  const t = useT()
  const { characterName } = useParams<{ characterName: string }>()
  // `useParams` already returns the decoded segment.
  const character = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === characterName))
  const index = useVaultStore((s) => s.index)
  const noteCharacterVisit = useVaultStore((s) => s.noteCharacterVisit)
  const found = Boolean(character)

  // Lets the start page offer "continue with <name>" for this vault next time.
  useEffect(() => {
    if (found && characterName) noteCharacterVisit(characterName)
  }, [found, characterName, noteCharacterVisit])

  if (!character) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center text-fg-muted">
        {t('characterSheet.notFound')}{' '}
        <Link to="/characters" className="text-primary hover:underline">
          {t('characterSheet.backToList')}
        </Link>
      </div>
    )
  }

  return (
    <CharacterSheet
      character={character.frontmatter}
      characterPath={character.path}
      index={index}
      body={character.frontmatter.backstory ?? character.body}
    />
  )
}
