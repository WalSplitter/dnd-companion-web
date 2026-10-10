import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useT } from '../i18n/useI18n'
import { useVaultStore } from '../store/vaultStore'
import { SheetLockContext } from '../store/canEdit'
import { CharacterSheet } from '../features/character-sheet/CharacterSheet'
import { inOwlbear } from '../owlbear/host'
import { withLiveVitals } from '../owlbear/live'
import { LivePoolsEditContext, type PoolChange } from '../owlbear/liveEdit'
import { changePools } from '../owlbear/liveSync'
import { OwlbearSheetBar } from '../owlbear/OwlbearSheetBar'
import { useOwlbearStore } from '../owlbear/owlbearStore'
import { RollSourceContext } from '../owlbear/rolls'

export function CharacterSheetPage() {
  const t = useT()
  const { characterName } = useParams<{ characterName: string }>()
  // `useParams` already returns the decoded segment.
  const character = useVaultStore((s) => s.vault.characters.find((c) => c.frontmatter.name === characterName))
  const index = useVaultStore((s) => s.index)
  const noteCharacterVisit = useVaultStore((s) => s.noteCharacterVisit)
  const found = Boolean(character)
  // In Owlbear, a linked character shows the room's live values; only the player who claimed it may
  // edit it here (they alone save it to the vault), so two people never write the same file. The GM
  // still changes its HP, temp HP and resilience — in the room only, the player saves them.
  const live = useOwlbearStore((s) => (inOwlbear && characterName ? s.roster[characterName] : undefined))
  const claimed = useOwlbearStore((s) => characterName !== undefined && s.claimed.includes(characterName))
  const isGM = useOwlbearStore((s) => s.role === 'GM')
  const isLive = Boolean(live)
  const editLive = useMemo(
    () => (isLive && isGM && !claimed && characterName ? (change: PoolChange) => void changePools(characterName, change) : null),
    [isLive, isGM, claimed, characterName],
  )
  const shown = useMemo(() => character && withLiveVitals(character.frontmatter, live), [character, live])

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
    <SheetLockContext value={isLive && !claimed}>
      <LivePoolsEditContext value={editLive}>
        <RollSourceContext value={live ? character.frontmatter.name : null}>
          {live && <OwlbearSheetBar character={character.frontmatter} />}
          <CharacterSheet
            character={shown ?? character.frontmatter}
            characterPath={character.path}
            index={index}
            body={character.frontmatter.backstory ?? character.body}
          />
        </RollSourceContext>
      </LivePoolsEditContext>
    </SheetLockContext>
  )
}
