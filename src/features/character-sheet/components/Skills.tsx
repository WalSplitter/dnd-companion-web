import { Card } from '../../../components/Card'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { formatModifier, skillBonus, skillProficiencyLevel } from '../../../vault/deriveStats'
import { SKILLS, type CharacterFrontmatter, type SkillKey } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

const LEVEL_TO_RAW = { none: 0, proficient: 1, expertise: 2 } as const
const NEXT_LEVEL = { none: 'proficient', proficient: 'expertise', expertise: 'none' } as const

function withSkillLevel(character: CharacterFrontmatter, key: SkillKey, level: 'none' | 'proficient' | 'expertise'): CharacterFrontmatter {
  const proficiencies = (character.skill_proficiencies ?? []).filter((k) => k !== key)
  const expertise = (character.skill_expertise ?? []).filter((k) => k !== key)
  if (level === 'proficient') proficiencies.push(key)
  else if (level === 'expertise') expertise.push(key)
  return { ...character, skill_proficiencies: proficiencies, skill_expertise: expertise.length > 0 ? expertise : undefined }
}

export function Skills({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  return (
    <Card title={t('cards.skills')}>
      <ul className="space-y-1.5">
        {SKILLS.map(({ key, ability }) => {
          const label = t(`skill.${key}`)
          const bonus = skillBonus(character, key)
          const level = skillProficiencyLevel(character, key)
          const target = character._write?.skills?.[key]
          const dot = <ProficiencyDot level={level} />
          return (
            <li key={key} className="flex items-center gap-2 text-sm">
              {canEdit && target ? (
                <button
                  type="button"
                  aria-label={t('a11y.cycleSkillProficiency', { label })}
                  onClick={() => {
                    const nextLevel = NEXT_LEVEL[level]
                    void updateCharacterField(characterPath, target, LEVEL_TO_RAW[nextLevel], (c) => withSkillLevel(c, key, nextLevel))
                  }}
                  className="cursor-pointer transition hover:opacity-70"
                >
                  {dot}
                </button>
              ) : (
                dot
              )}
              <span className="w-8 font-semibold text-fg">{formatModifier(bonus)}</span>
              <span className="text-fg-muted">{label}</span>
              <span className="ml-auto flex items-center gap-2">
                <span className="text-xs uppercase text-fg-muted/70">{ability}</span>
                <D20RollButton label={label} modifier={bonus} />
              </span>
            </li>
          )
        })}
      </ul>
    </Card>
  )
}
