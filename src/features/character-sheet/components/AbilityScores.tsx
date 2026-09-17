import { Card } from '../../../components/Card'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { abilityModifier, formatModifier } from '../../../vault/deriveStats'
import { ABILITIES, type CharacterFrontmatter } from '../../../vault/types'

export function AbilityScores({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  return (
    <Card title={t('cards.abilityScores')}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {ABILITIES.map(({ key }) => {
          const label = t(`ability.${key}`)
          const score = character.abilities[key]
          const mod = abilityModifier(score)
          const target = character._write?.abilities?.[key]
          return (
            <div
              key={key}
              className="flex flex-col items-center rounded-lg border border-border bg-surface-2 px-2 py-3 text-center"
            >
              <span className="text-xs font-medium uppercase text-fg-muted">{label.slice(0, 3)}</span>
              <span className="mt-1 text-xl font-bold text-fg">{formatModifier(mod)}</span>
              {canEdit && target ? (
                <EditableNumber
                  key={score}
                  value={score}
                  onCommit={(next) =>
                    void updateCharacterField(characterPath, target, next, (c) => ({ ...c, abilities: { ...c.abilities, [key]: next } }))
                  }
                  className="mt-0.5 w-12 rounded-md border border-border bg-surface px-1 text-center text-xs text-fg-muted"
                />
              ) : (
                <span className="mt-0.5 text-xs text-fg-muted">{score}</span>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}
