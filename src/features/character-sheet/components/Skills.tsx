import { Card } from '../../../components/Card'
import { EditableNumber } from '../../../components/EditableNumber'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/I18nContext'
import { useVaultStore } from '../../../store/vaultStore'
import { formatModifier, nimbleSkillBonus, skillBonus, skillProficiencyLevel } from '../../../vault/deriveStats'
import { NIMBLE_SKILL_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../../../vault/types'
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

/** Nimble skills have no proficiency levels — just an independently-trained flat bonus (0-10,
 * untrained = 0) on top of the governing attribute. Edited directly as a number rather than cycled
 * through discrete levels. */
function NimbleSkillRow({ character, characterPath, skill }: { character: CharacterFrontmatter; characterPath: string; skill: SkillKey }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  const label = t(`skill.${skill}`)
  const attribute = NIMBLE_SKILL_ATTRIBUTES[skill]
  const trained = character.nimble_skills?.[skill] ?? 0
  const bonus = nimbleSkillBonus(character, skill)
  const target = character._write?.nimble_skills?.[skill]

  return (
    <li className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10 ${trained > 0 ? 'bg-trim/[0.06]' : ''}`}>
      {canEdit && target ? (
        <EditableNumber
          value={trained}
          onCommit={(next) =>
            void updateCharacterField(characterPath, target, next, (c) => ({ ...c, nimble_skills: { ...c.nimble_skills, [skill]: next } }))
          }
          className="w-8 rounded border border-border bg-surface px-1 text-center text-xs font-semibold text-fg"
        />
      ) : (
        <span className="w-4 text-center text-xs text-fg-muted">{trained > 0 ? `+${trained}` : ''}</span>
      )}
      <span className={`w-8 text-right font-num ${trained > 0 ? 'text-trim' : 'text-fg'}`}>{formatModifier(bonus)}</span>
      <span className={trained > 0 ? 'text-fg' : 'text-fg-muted'}>{label}</span>
      <span className="ml-auto flex items-center gap-2">
        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted/70">{attribute.toUpperCase()}</span>
        <D20RollButton label={label} modifier={bonus} />
      </span>
    </li>
  )
}

export function Skills({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const editPermission = useVaultStore((s) => s.editPermission)
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const canEdit = editPermission === 'granted'

  const nimble = Boolean(character.nimble_attributes)

  return (
    <Card title={t('cards.skills')}>
      <ul className="space-y-0.5">
        {nimble
          ? SKILLS.map(({ key }) => <NimbleSkillRow key={key} character={character} characterPath={characterPath} skill={key} />)
          : SKILLS.map(({ key, ability }) => {
              const label = t(`skill.${key}`)
              const bonus = skillBonus(character, key)
              const level = skillProficiencyLevel(character, key)
              const target = character._write?.skills?.[key]
              const dot = <ProficiencyDot level={level} />
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10 ${level === 'none' ? '' : 'bg-trim/[0.06]'}`}
                >
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
                  <span className={`w-8 text-right font-num ${level === 'none' ? 'text-fg' : 'text-trim'}`}>{formatModifier(bonus)}</span>
                  <span className={level === 'none' ? 'text-fg-muted' : 'text-fg'}>{label}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted/70">{ability}</span>
                    <D20RollButton label={label} modifier={bonus} />
                  </span>
                </li>
              )
            })}
      </ul>
    </Card>
  )
}
