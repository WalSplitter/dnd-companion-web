import { Card } from '../../../components/Card'
import { D20RollButton, DamageRollButton } from '../../../dice/RollButton'
import { useT, type TranslationKey } from '../../../i18n/I18nContext'
import { formatModifier } from '../../../vault/deriveStats'
import type { CharacterFrontmatter } from '../../../vault/types'

const KIND_KEY: Record<string, TranslationKey> = {
  melee: 'weaponKind.melee',
  ranged: 'weaponKind.ranged',
  thrown: 'weaponKind.thrown',
}

export function Attacks({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const attacks = character.attacks
  if (!attacks || attacks.length === 0) return null

  return (
    <Card title={t('cards.attacks')}>
      <ul className="space-y-2">
        {attacks.map((attack) => (
          <li key={attack.name} className="rounded-lg border border-border bg-surface-2 p-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold text-fg">{attack.name}</span>
              <span className="text-xs uppercase text-fg-muted">{t(KIND_KEY[attack.kind])}</span>
              {attack.range && <span className="text-xs text-fg-muted">{attack.range}</span>}
              {attack.properties && attack.properties.length > 0 && (
                <span className="text-xs text-fg-muted">({attack.properties.join(', ')})</span>
              )}
              <span className="ml-auto flex items-center gap-1.5">
                <D20RollButton label={t('roll.attackSuffix', { name: attack.name })} modifier={attack.attack_bonus} />
                <span className="text-xs text-fg-muted">{formatModifier(attack.attack_bonus)}</span>
                <DamageRollButton
                  label={t('roll.damageSuffix', { name: attack.name })}
                  dice={attack.damage_dice}
                  bonus={attack.damage_bonus}
                  damageType={attack.damage_type}
                />
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
