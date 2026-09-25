import { Card } from '../../../components/Card'
import { D20Modifier } from '../../../components/ExhaustedValue'
import { D20RollButton } from '../../../dice/RollButton'
import { useT } from '../../../i18n/useI18n'
import { formatModifier, nimbleAttributeValue, nimbleSkillBonus, nimbleSkillValue, skillBonus, skillProficiencyLevel } from '../../../vault/deriveStats'
import { NIMBLE_SKILL_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type SkillKey } from '../../../vault/types'
import { ProficiencyDot } from './ProficiencyDot'

/** Nimble skills have no proficiency levels — just an independently-trained flat bonus (0 to
 * `NIMBLE_SKILL_MAX`, untrained = 0) on top of the governing attribute. Read-only: the DM sets skill
 * values in the vault, the web app only shows them. */
function NimbleSkillRow({ character, skill }: { character: CharacterFrontmatter; skill: SkillKey }) {
  const t = useT()
  const label = t(`skill.${skill}`)
  const attribute = NIMBLE_SKILL_ATTRIBUTES[skill]
  const trained = nimbleSkillValue(character, skill)
  const bonus = nimbleSkillBonus(character, skill)

  const breakdown = t('stats.skillBreakdown', {
    attribute: attribute.toUpperCase(),
    attributeValue: formatModifier(nimbleAttributeValue(character, attribute)),
    skill: formatModifier(trained),
  })

  return (
    <li
      title={breakdown}
      className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10 ${trained > 0 ? 'bg-trim/[0.06]' : ''}`}
    >
      <D20Modifier value={bonus} className={`w-8 text-right font-num ${trained > 0 ? 'text-trim' : 'text-fg'}`} />
      <span className={trained > 0 ? 'text-fg' : 'text-fg-muted'}>{label}</span>
      {trained > 0 && (
        <span className="rounded-full border border-trim/35 bg-trim/10 px-1.5 text-[0.65rem] font-semibold leading-4 text-trim">
          +{trained}
        </span>
      )}
      <span className="ml-auto flex items-center gap-2">
        <span className="text-[0.65rem] font-medium uppercase tracking-wider text-fg-muted/70">{attribute.toUpperCase()}</span>
        <D20RollButton label={label} modifier={bonus} />
      </span>
    </li>
  )
}

/** Skill list. Read-only in both schemas, like the attributes: only rolling happens here. */
export function Skills({ character }: { character: CharacterFrontmatter }) {
  const t = useT()
  const nimble = Boolean(character.nimble_attributes)

  return (
    <Card title={t('cards.skills')}>
      <ul className="space-y-0.5">
        {nimble
          ? SKILLS.map(({ key }) => <NimbleSkillRow key={key} character={character} skill={key} />)
          : SKILLS.map(({ key, ability }) => {
              const label = t(`skill.${key}`)
              const bonus = skillBonus(character, key)
              const level = skillProficiencyLevel(character, key)
              return (
                <li
                  key={key}
                  className={`flex items-center gap-2.5 rounded-md px-2 py-1 text-sm transition hover:bg-trim/10 ${level === 'none' ? '' : 'bg-trim/[0.06]'}`}
                >
                  <ProficiencyDot level={level} />
                  <D20Modifier value={bonus} className={`w-8 text-right font-num ${level === 'none' ? 'text-fg' : 'text-trim'}`} />
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
