import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { derivationText } from '../../../components/derivationText'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { skillDerivation } from '../../../rules/derivation'
import { skillBonus, skillProficiencyLevel } from '../../../rules/dnd5e'
import { nimbleSkillBonus, nimbleSkillValue } from '../../../rules/endeavour'
import { NIMBLE_SKILL_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'
import { isEndeavour } from '../../../rules/ruleset'

/** Nimble skills have no proficiency levels — just an independently-trained flat bonus (0 to
 * `NIMBLE_SKILL_MAX`, untrained = 0) on top of the governing attribute. Read-only: the DM sets skill
 * values in the vault, the web app only shows them. */
function NimbleSkillRow({ character, skill }: { character: CharacterFrontmatter; skill: SkillKey }) {
  const t = useT()
  const label = t(`skill.${skill}`)
  const attribute = NIMBLE_SKILL_ATTRIBUTES[skill]
  const trained = nimbleSkillValue(character, skill)
  const bonus = nimbleSkillBonus(character, skill)
  const derivation = skillDerivation(character, skill)

  return (
    <li
      title={`${label}: ${derivationText(t, derivation)}`}
      className="roll-row group flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10"
    >
      <D20Modifier value={bonus} className={`w-8 text-right font-num ${trained > 0 ? 'text-trim' : 'text-fg'}`} />
      <span className={trained > 0 ? 'text-fg' : 'text-fg-muted'}>{label}</span>
      {trained > 0 && (
        <span className="font-num text-[0.7rem] text-trim/70">
          +{trained}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted/70">{attribute.toUpperCase()}</span>
        <D20RollButton label={label} modifier={bonus} derivation={derivation} />
      </span>
    </li>
  )
}

/** Skill list. Read-only in both schemas, like the attributes: only rolling happens here. */
export function Skills({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const nimble = isEndeavour(character)

  return (
    <Card title={t('cards.skills')}>
      <ul className="space-y-0.5">
        {nimble
          ? SKILLS.map(({ key }) => <NimbleSkillRow key={key} character={character} skill={key} />)
          : SKILLS.map(({ key, ability }) => {
              const label = t(`skill.${key}`)
              const bonus = skillBonus(character, key)
              const level = skillProficiencyLevel(character, key)
              const derivation = skillDerivation(character, key)
              return (
                <li
                  key={key}
                  title={`${label}: ${derivationText(t, derivation)}`}
                  className="roll-row group flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10"
                >
                  <ProficiencyDot level={level} />
                  <D20Modifier value={bonus} className={`w-8 text-right font-num ${level === 'none' ? 'text-fg' : 'text-trim'}`} />
                  <span className={level === 'none' ? 'text-fg-muted' : 'text-fg'}>{label}</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted/70">{ability}</span>
                    <D20RollButton label={label} modifier={bonus} derivation={derivation} />
                  </span>
                </li>
              )
            })}
      </ul>
    </Card>
  )
}
