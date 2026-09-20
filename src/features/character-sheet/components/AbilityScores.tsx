import { Card } from '../../../components/Card'
import { EditableNumber } from '../../../components/EditableNumber'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { abilityModifier, formatModifier } from '../../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, type CharacterFrontmatter, type NimbleAttributeKey } from '../../../vault/types'

/** A medallion + editable plate, shared by the D&D-shaped `abilities` and Nimble `nimble_attributes`
 * branches below — only the label/value/write-target source differs between them. */
function AbilityMedallion({
  label,
  abbr,
  value,
  displayValue,
  editable,
  onCommit,
}: {
  label: string
  abbr: string
  value: number
  displayValue: string
  editable: boolean
  onCommit: (next: number) => void
}) {
  return (
    <div className="flex flex-col items-center text-center" title={label}>
      <span className="mb-2 font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-fg-muted">{abbr}</span>
      <div className="rpg-medallion">
        <span className="font-num text-2xl text-fg">{displayValue}</span>
      </div>
      <div className="rpg-plate relative -mt-2.5 px-2.5 py-0.5">
        {editable ? (
          <EditableNumber
            key={value}
            value={value}
            onCommit={onCommit}
            className="w-11 rounded border border-border bg-surface px-1 text-center text-xs font-semibold text-fg"
          />
        ) : (
          <span className="text-xs font-semibold text-fg-muted">{value}</span>
        )}
      </div>
    </div>
  )
}

export function AbilityScores({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  const nimble = character.nimble_attributes

  return (
    <Card title={t('cards.abilityScores')}>
      {/* 8 Nimble attributes lay out cleanly as 2 rows of 4; the 6 D&D abilities as 2 rows of 3. */}
      <div className={`grid gap-x-2 gap-y-5 pb-1 pt-1 ${nimble ? 'grid-cols-4' : 'grid-cols-3'}`}>
        {nimble
          ? NIMBLE_ATTRIBUTES.map(({ key }) => {
              const label = t(`nimbleAttribute.${key}`)
              const value = nimble[key]
              const target = character._write?.nimble_attributes?.[key]
              return (
                <AbilityMedallion
                  key={key}
                  label={label}
                  abbr={key.toUpperCase()}
                  value={value}
                  displayValue={formatModifier(value)}
                  editable={canEdit && Boolean(target)}
                  onCommit={(next) =>
                    void updateCharacterField(characterPath, target, next, (c) => ({
                      ...c,
                      nimble_attributes: { ...c.nimble_attributes, [key]: next } as Record<NimbleAttributeKey, number>,
                    }))
                  }
                />
              )
            })
          : ABILITIES.map(({ key }) => {
              const label = t(`ability.${key}`)
              const score = character.abilities[key]
              const mod = abilityModifier(score)
              const target = character._write?.abilities?.[key]
              return (
                <AbilityMedallion
                  key={key}
                  label={label}
                  abbr={label.slice(0, 3)}
                  value={score}
                  displayValue={formatModifier(mod)}
                  editable={canEdit && Boolean(target)}
                  onCommit={(next) =>
                    void updateCharacterField(characterPath, target, next, (c) => ({ ...c, abilities: { ...c.abilities, [key]: next } }))
                  }
                />
              )
            })}
      </div>
    </Card>
  )
}
