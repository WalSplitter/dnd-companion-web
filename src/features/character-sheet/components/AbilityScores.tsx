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
      <div className="grid grid-cols-3 gap-x-2 gap-y-5 pb-1 pt-1">
        {ABILITIES.map(({ key }) => {
          const label = t(`ability.${key}`)
          const score = character.abilities[key]
          const mod = abilityModifier(score)
          const target = character._write?.abilities?.[key]
          return (
            <div key={key} className="flex flex-col items-center text-center" title={label}>
              <span className="mb-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{label.slice(0, 3)}</span>
              <div className="rpg-medallion">
                <span className="font-num text-2xl text-fg">{formatModifier(mod)}</span>
              </div>
              <div className="rpg-plate relative -mt-2.5 px-2.5 py-0.5">
              {canEdit && target ? (
                <EditableNumber
                  key={score}
                  value={score}
                  onCommit={(next) =>
                    void updateCharacterField(characterPath, target, next, (c) => ({ ...c, abilities: { ...c.abilities, [key]: next } }))
                  }
                  className="w-11 rounded border border-border bg-surface px-1 text-center text-xs font-semibold text-fg"
                />
              ) : (
                <span className="text-xs font-semibold text-fg-muted">{score}</span>
              )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
