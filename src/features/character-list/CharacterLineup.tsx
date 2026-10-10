import { useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { initials } from '../../components/initials'
import { D20PenaltyContext } from '../../dice/d20Penalty'
import { useT } from '../../i18n/useI18n'
import { characterRoute } from '../../routes/paths'
import { classSummary, exhaustionD20Penalty, totalCharacterLevel } from '../../rules/deriveStats'
import type { CharacterFrontmatter, VaultFile } from '../../vault/types'
import { characterFate } from '../../rules/vitals'
import { FallenSeal, LifeForce, VitalStatus } from './CharacterParts'
import { formationRanks, layoutFormation, type FormationRank } from './formation'
import { FormationEnemy } from './FormationEnemy'

/** Portraits shrink towards the front line (furthest from the viewer), so the formation reads as
 * standing in depth. */
const PORTRAIT_SIZE: Record<FormationRank, string> = {
  front: 'size-24',
  middle: 'size-28',
  back: 'size-32',
}
/** The same sizes for the monogram fallback; `!` beats `.rpg-medallion`'s own fixed size. */
const MEDALLION_SIZE: Record<FormationRank, string> = {
  front: '!size-24 text-2xl',
  middle: '!size-28 text-2xl',
  back: '!size-32 text-3xl',
}

/** Seconds per idle "breath" of a figure; each member starts at its own phase. */
const BREATH_SECONDS = 5

/** The element's inner width (padding box — what absolutely placed children are positioned in),
 * kept current while it resizes. Measured before paint, so the formation never flashes at a wrong width. */
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    setWidth(element.clientWidth)
    const observer = new ResizeObserver(() => setWidth(element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

/**
 * The party standing in battle formation on a lit stage, seen over their shoulders — the front line
 * (armored melee) at the top facing the enemy drawn across the stage's top edge (`FormationEnemy`), the back line (full casters) at the bottom nearest
 * the viewer, the middle in between (see `formationRank`). `layoutFormation` places everyone freely: staggered into each other's gaps,
 * a little off-grid, never overlapping.
 */
export function PartyFormation({ characters }: { characters: VaultFile<CharacterFrontmatter>[] }) {
  const t = useT()
  const stageRef = useRef<HTMLDivElement>(null)
  const width = useWidth(stageRef)
  const ranks = formationRanks(characters, (c) => c.frontmatter)
  const { placed, height, enemyBand } = layoutFormation(ranks, width, (c) => c.path)
  // Entrance stagger runs front to back.
  const order = [...placed].sort((a, b) => a.depth - b.depth || a.x - b.x)

  return (
    <div ref={stageRef} className="formation-stage rpg-panel" style={{ height: width ? height : undefined }}>
      <div aria-hidden className="formation-floor" />
      {width > 0 && <FormationEnemy height={enemyBand} />}
      {width > 0 &&
        placed.map((member) => (
          <div
            key={member.entry.path}
            className="absolute"
            title={`${t(`characterList.rank.${member.rank}`)} — ${t('characterList.rankHint')}`}
            style={{
              left: member.x,
              top: member.y,
              width: member.width,
              zIndex: member.depth + 1,
              transform: `translateX(-50%) scale(${member.scale})`,
              transformOrigin: 'top center',
            }}
          >
            <Link
              to={characterRoute(member.entry.frontmatter.name)}
              className="rise-in block"
              style={{ '--i': order.indexOf(member) } as CSSProperties}
            >
              <LineupMember character={member.entry.frontmatter} rank={member.rank} phase={member.phase} />
            </Link>
          </div>
        ))}
    </div>
  )
}

/**
 * One party member on the stage, like a JRPG party screen: a portrait standing on a glowing
 * pedestal, then name, class and the vitals bars. Everything else lives on the card and the sheet.
 */
function LineupMember({ character, rank, phase }: { character: CharacterFrontmatter; rank: FormationRank; phase: number }) {
  return (
    <D20PenaltyContext value={exhaustionD20Penalty(character)}>
      <LineupMemberBody character={character} rank={rank} phase={phase} />
    </D20PenaltyContext>
  )
}

function LineupMemberBody({ character: c, rank, phase }: { character: CharacterFrontmatter; rank: FormationRank; phase: number }) {
  const fate = characterFate(c)
  const fallen = fate !== 'alive'
  const dead = fate === 'dead'

  return (
    <div className={`lineup-member group flex flex-col items-center text-center ${fallen ? 'is-fallen' : ''}`}>
      <div className="lineup-breath" style={{ animationDelay: `${-phase * BREATH_SECONDS}s` }}>
        <div className="lineup-figure relative">
          {c.portrait_url ? (
            <img src={c.portrait_url} alt="" className={`lineup-portrait ${PORTRAIT_SIZE[rank]} rounded-lg border-2 border-trim object-cover`} />
          ) : (
            <div
              aria-hidden
              className={`lineup-portrait rpg-medallion ${MEDALLION_SIZE[rank]} !rounded-lg border-2 border-trim font-display font-bold text-trim`}
            >
              {initials(c.name)}
            </div>
          )}
          <span className="absolute -bottom-3 left-1/2 flex size-7 -translate-x-1/2 items-center justify-center rounded-full border-2 border-trim bg-surface font-num text-xs font-bold text-trim shadow-[0_0_8px_color-mix(in_srgb,var(--color-trim)_55%,transparent)]">
            {totalCharacterLevel(c)}
          </span>
          {fallen && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
              <FallenSeal dead={dead} />
            </span>
          )}
        </div>
      </div>
      <div aria-hidden className="lineup-pedestal" />

      <div className="lineup-plate mt-1 w-full">
        <div className="line-clamp-2 font-display text-sm leading-tight font-bold tracking-wide text-balance text-fg">{c.name}</div>
        <div className="truncate text-[0.62rem] font-bold uppercase tracking-wider text-trim">{classSummary(c)}</div>
        <div className="mt-2 w-full">
          <LifeForce character={c} withStatus={false} />
        </div>
        <VitalStatus character={c} spread={false} tokensOnly className="mt-1.5 flex-wrap justify-center" />
      </div>
    </div>
  )
}
