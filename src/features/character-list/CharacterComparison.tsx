import { Fragment, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { D20Modifier } from '../../components/ExhaustedValue'
import { D20PenaltyContext } from '../../dice/d20Penalty'
import { useT } from '../../i18n/useI18n'
import {
  abilityModifier,
  evasionValue,
  exhaustionD20Penalty,
  formatModifier,
  initiativeBonus,
  movementSquares,
  nimbleAttributeValue,
  nimbleSkillBonus,
  nimbleSkillValue,
  skillBonus,
  skillProficiencyLevel,
} from '../../vault/deriveStats'
import { ABILITIES, NIMBLE_ATTRIBUTES, SKILLS, type CharacterFrontmatter, type VaultFile } from '../../vault/types'
import { resiliencePool } from '../character-sheet/vitals'
import { Portrait } from './CharacterCard'

/** How a row's numbers are shown: a d20 bonus (lowered by exhaustion), a plain modifier, or a number. */
type RowFormat = 'd20' | 'modifier' | 'number'

interface Row {
  key: string
  label: string
  title?: string
  format: RowFormat
  value: (c: CharacterFrontmatter) => number | undefined
  /** Trained skill/proficiency — untrained values are shown muted and never highlighted as best:
   * a raw attribute bonus nobody trained isn't worth pointing at. */
  trained?: (c: CharacterFrontmatter) => boolean
}

interface Section {
  title: string
  rows: Row[]
}

/** The value a row is ranked by: d20 bonuses after the exhaustion penalty, so the highlight points at
 * whoever would actually roll best right now. */
function effectiveValue(row: Row, c: CharacterFrontmatter): number | undefined {
  const value = row.value(c)
  if (value === undefined) return undefined
  return row.format === 'd20' ? value - exhaustionD20Penalty(c) : value
}

/** Every value tied for the row's best, or none when the whole party is level (nothing to point at). */
export function bestValue(values: (number | undefined)[]): number | undefined {
  const known = values.filter((v): v is number => v !== undefined)
  if (known.length < 2) return undefined
  const best = Math.max(...known)
  return known.every((v) => v === best) ? undefined : best
}

function useSections(characters: CharacterFrontmatter[]): Section[] {
  const t = useT()
  const anyNimble = characters.some((c) => c.nimble_attributes)
  const anyClassic = characters.some((c) => !c.nimble_attributes)

  const combat: Row[] = [
    { key: 'ac', label: t('short.armorClass'), title: t('stats.armorClass'), format: 'number', value: (c) => c.armor_class },
    ...(anyNimble
      ? [{ key: 'ev', label: t('short.evasion'), title: t('stats.evasion'), format: 'number', value: evasionValue } satisfies Row]
      : []),
    { key: 'init', label: t('stats.initiative'), format: 'd20', value: initiativeBonus },
    { key: 'move', label: t('stats.movement'), format: 'number', value: movementSquares },
    { key: 'hp', label: t('cards.hitPoints'), title: t('characterList.compareMaxHint'), format: 'number', value: (c) => c.hp.max },
    ...(characters.some((c) => resiliencePool(c))
      ? [{ key: 'rp', label: t('stats.resilience'), title: t('characterList.compareMaxHint'), format: 'number', value: (c) => resiliencePool(c)?.max } satisfies Row]
      : []),
    ...(characters.some((c) => c.spellcasting?.mana)
      ? [{ key: 'mana', label: t('stats.mana'), title: t('characterList.compareMaxHint'), format: 'number', value: (c) => c.spellcasting?.mana?.max } satisfies Row]
      : []),
  ]

  const attributes: Row[] = [
    ...(anyNimble
      ? NIMBLE_ATTRIBUTES.map(
          ({ key }): Row => ({
            key: `n-${key}`,
            label: t(`nimbleAttribute.${key}`),
            format: 'modifier',
            value: (c) => (c.nimble_attributes ? nimbleAttributeValue(c, key) : undefined),
          }),
        )
      : []),
    ...(anyClassic
      ? ABILITIES.map(
          ({ key }): Row => ({
            key: `a-${key}`,
            label: t(`ability.${key}`),
            format: 'modifier',
            value: (c) => (c.nimble_attributes ? undefined : abilityModifier(c.abilities[key])),
          }),
        )
      : []),
  ]

  const skills: Row[] = SKILLS.map(
    ({ key }): Row => ({
      key: `s-${key}`,
      label: t(`skill.${key}`),
      format: 'd20',
      value: (c) => (c.nimble_attributes ? nimbleSkillBonus(c, key) : skillBonus(c, key)),
      trained: (c) => (c.nimble_attributes ? nimbleSkillValue(c, key) > 0 : skillProficiencyLevel(c, key) !== 'none'),
    }),
  ).sort((a, b) => a.label.localeCompare(b.label))

  return [
    { title: t('cards.combat'), rows: combat },
    { title: t('cards.abilityScores'), rows: attributes },
    { title: t('cards.skills'), rows: skills },
  ]
}

function Cell({ row, character: c, best }: { row: Row; character: CharacterFrontmatter; best: boolean }) {
  const value = row.value(c)
  const muted = row.trained && !row.trained(c)
  let content: ReactNode = '—'
  if (value !== undefined) {
    content =
      row.format === 'd20' ? (
        <D20PenaltyContext value={exhaustionD20Penalty(c)}>
          <D20Modifier value={value} />
        </D20PenaltyContext>
      ) : row.format === 'modifier' ? (
        formatModifier(value)
      ) : (
        value
      )
  }
  return (
    <td
      className={`px-2 py-1.5 text-center font-num ${
        best ? 'compare-best font-bold text-trim' : value === undefined || muted ? 'text-fg-muted/70' : 'text-fg'
      }`}
    >
      {content}
    </td>
  )
}

/**
 * The whole party side by side: combat values, attributes and skills as rows, characters as columns,
 * with each row's best value highlighted — answers "who should roll this?" at the table at a glance.
 * The first column stays put while the table scrolls sideways on narrow screens.
 */
export function CharacterComparison({ characters }: { characters: VaultFile<CharacterFrontmatter>[] }) {
  const t = useT()
  const party = characters.map((c) => c.frontmatter)
  const sections = useSections(party)

  return (
    // The panel and the scroll container are separate elements: the panel's corner brackets sit 1px
    // outside its box and would otherwise make the table scroll both ways.
    <div className="rpg-panel p-0">
      <div className="themed-scroll overflow-x-auto rounded-lg">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-trim/25">
              <th scope="col" className="sticky left-0 z-10 bg-surface px-3 py-2 text-left">
                <span className="sr-only">{t('characterList.compareStat')}</span>
              </th>
              {characters.map((c) => (
                <th key={c.path} scope="col" className="min-w-24 px-2 py-2.5 align-top font-normal">
                  <Link
                    to={`/characters/${encodeURIComponent(c.frontmatter.name)}`}
                    className="group flex flex-col items-center gap-2 text-center"
                  >
                    <Portrait character={c.frontmatter} small />
                    <span className="max-w-28 font-display text-xs leading-tight font-bold tracking-wide text-balance text-fg group-hover:text-trim">
                      {c.frontmatter.name}
                    </span>
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections
              .filter((s) => s.rows.length > 0)
              .map((section) => (
                <Fragment key={section.title}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={characters.length + 1}
                      className="sticky left-0 bg-trim/[0.06] px-3 pb-1 pt-3 text-left font-display text-[0.7rem] font-bold uppercase tracking-[0.18em] text-trim"
                    >
                      {section.title}
                    </th>
                  </tr>
                  {section.rows.map((row) => {
                    const best = bestValue(party.map((c) => effectiveValue(row, c)))
                    return (
                      <tr key={row.key} className="border-t border-trim/10 hover:bg-trim/[0.04]">
                        <th
                          scope="row"
                          title={row.title}
                          className="sticky left-0 z-10 bg-surface px-3 py-1.5 text-left text-xs font-medium whitespace-nowrap text-fg-muted"
                        >
                          {row.label}
                        </th>
                        {party.map((c, i) => (
                          <Cell
                            key={characters[i].path}
                            row={row}
                            character={c}
                            best={best !== undefined && effectiveValue(row, c) === best && (row.trained?.(c) ?? true)}
                          />
                        ))}
                      </tr>
                    )
                  })}
                </Fragment>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
