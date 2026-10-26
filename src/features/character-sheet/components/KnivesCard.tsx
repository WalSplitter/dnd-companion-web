import { useId } from 'react'
import { Card } from '../../../components/Card'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { renderObsidianBody } from '../../../components/obsidian/renderObsidian'
import type { Knife, KnifeKind, KnifeState } from '../../../vault/types'

/** The range the Knife Theory write-up recommends. */
const RECOMMENDED = { min: 7, max: 12 }

const GUIDE_URL = 'https://www.gmbinder.com/share/-L-9CvlTWhoADagJfSZO'

const KIND: Record<KnifeKind, { icon: string; label: TranslationKey; tip: TranslationKey }> = {
  person: { icon: '💞', label: 'bio.knives.kind.person', tip: 'bio.knives.tip.person' },
  trauma: { icon: '🌑', label: 'bio.knives.kind.trauma', tip: 'bio.knives.tip.trauma' },
  mystery: { icon: '🗝️', label: 'bio.knives.kind.mystery', tip: 'bio.knives.tip.mystery' },
  enemy: { icon: '⚔️', label: 'bio.knives.kind.enemy', tip: 'bio.knives.tip.enemy' },
  obligation: { icon: '📜', label: 'bio.knives.kind.obligation', tip: 'bio.knives.tip.obligation' },
  failure: { icon: '💔', label: 'bio.knives.kind.failure', tip: 'bio.knives.tip.failure' },
  crime: { icon: '🩸', label: 'bio.knives.kind.crime', tip: 'bio.knives.tip.crime' },
  accused: { icon: '⛓️', label: 'bio.knives.kind.accused', tip: 'bio.knives.tip.accused' },
  prejudice: { icon: '👁️', label: 'bio.knives.kind.prejudice', tip: 'bio.knives.tip.prejudice' },
  heirloom: { icon: '💍', label: 'bio.knives.kind.heirloom', tip: 'bio.knives.tip.heirloom' },
  secret: { icon: '🤫', label: 'bio.knives.kind.secret', tip: 'bio.knives.tip.secret' },
}

/** In the order the card shows them: what is in play right now first, the closed stories last. */
const STATES: { state: KnifeState; label: TranslationKey; hint: TranslationKey }[] = [
  { state: 'drawn', label: 'bio.knives.state.drawn', hint: 'bio.knives.state.drawnHint' },
  { state: 'sheathed', label: 'bio.knives.state.sheathed', hint: 'bio.knives.state.sheathedHint' },
  { state: 'healed', label: 'bio.knives.state.healed', hint: 'bio.knives.state.healedHint' },
]

const BLADE_TONE: Record<KnifeState, string> = {
  drawn: 'text-danger',
  sheathed: 'text-trim',
  healed: 'text-fg-muted/70',
}

/**
 * A dagger pointing right, drawn by its state: in its sheath (the sheath slides a little on hover,
 * a peek at the steel), bare with a glint running along the edge, or faded with a stitched scar.
 */
function Blade({ state, className = '' }: { state: KnifeState; className?: string }) {
  const clip = useId()
  return (
    <svg viewBox="0 0 64 16" aria-hidden className={`knife-blade is-${state} h-4 w-16 shrink-0 ${BLADE_TONE[state]} ${className}`}>
      <defs>
        <clipPath id={clip}>
          <path d="M21 5.5H54L62 8L54 10.5H21Z" />
        </clipPath>
      </defs>
      <circle cx="4" cy="8" r="2.5" fill="currentColor" opacity="0.8" />
      <rect x="6" y="6" width="12" height="4" rx="1" fill="currentColor" opacity="0.45" />
      <path d="M9 6v4M12 6v4M15 6v4" stroke="currentColor" strokeWidth="0.8" opacity="0.7" />
      <rect x="18" y="2" width="3" height="12" rx="1" fill="currentColor" />
      <path d="M21 5.5H54L62 8L54 10.5H21Z" fill="currentColor" opacity={state === 'healed' ? 0.35 : 0.85} />
      <path d="M23 8H50" stroke="var(--color-surface)" strokeWidth="0.8" opacity="0.5" />
      {state === 'drawn' && (
        <g clipPath={`url(#${clip})`}>
          <rect className="knife-glint" x="12" y="0" width="5" height="16" fill="white" opacity="0.7" transform="skewX(-25)" />
        </g>
      )}
      {state === 'sheathed' && (
        <g className="knife-sheath">
          <path d="M20.5 4H54Q63 8 54 12H20.5Z" fill="var(--color-surface-2)" stroke="currentColor" strokeWidth="1" />
          <path d="M25 4v8M47 4v8" stroke="currentColor" strokeWidth="1.4" opacity="0.8" />
          <path d="M54.5 5.2Q60.5 8 54.5 10.8" fill="none" stroke="currentColor" strokeWidth="1" />
        </g>
      )}
      {state === 'healed' && (
        <path
          d="M24 8H52M27 5.5l2 5M33 5.5l2 5M39 5.5l2 5M45 5.5l2 5"
          stroke="var(--color-danger)"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.75"
        />
      )}
    </svg>
  )
}

/** Small slanted blades, one per knife, with the recommended stretch underlined. */
function Meter({ count }: { count: number }) {
  const t = useT()
  const slots = Math.max(RECOMMENDED.max, count)
  return (
    <div className="flex items-end gap-2" title={t('bio.knives.meter', { n: count })}>
      <div aria-hidden className="flex items-end gap-[3px]">
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className={`h-3 w-1 -skew-x-12 rounded-t-full ${i < count ? (i < RECOMMENDED.max ? 'bg-trim' : 'bg-danger') : 'bg-trim/15'} ${
              i >= RECOMMENDED.min - 1 && i < RECOMMENDED.max ? 'shadow-[0_2px_0_-0.5px_var(--color-trim)]' : ''
            }`}
          />
        ))}
      </div>
      <span className="font-display text-xs font-bold tabular-nums text-trim">
        {count}
        <span className="font-normal text-fg-muted">
          {' '}
          / {RECOMMENDED.min}–{RECOMMENDED.max}
        </span>
      </span>
    </div>
  )
}

/** The player's explainer: what a knife is, how to play one, how to forge good ones. */
function Guide({ count }: { count: number }) {
  const t = useT()
  const hint =
    count < RECOMMENDED.min ? t('bio.knives.fewer', { n: RECOMMENDED.min - count }) : count > RECOMMENDED.max ? t('bio.knives.more') : undefined
  return (
    <details className="group mb-4 rounded-lg border border-dashed border-trim/30 bg-surface-2/40 px-3 py-2">
      <summary className="cursor-pointer list-none text-sm font-semibold text-fg-muted hover:text-trim">
        <span aria-hidden className="mr-1.5 inline-block transition group-open:rotate-90">
          ▸
        </span>
        {t('bio.knives.guide')}
      </summary>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-fg/90">
        <p className="max-w-prose">{t('bio.knives.guide.intro')}</p>
        <GuideList title={t('bio.knives.guide.playTitle')} numbered items={['play1', 'play2', 'play3', 'play4', 'play5']} />
        <GuideList title={t('bio.knives.guide.writeTitle')} items={['write1', 'write2', 'write3']} />
        <section>
          <h4 className="mb-1.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-trim">{t('bio.knives.guide.statesTitle')}</h4>
          <ul className="space-y-1.5">
            {STATES.map((s) => (
              <li key={s.state} className="flex items-center gap-3">
                <Blade state={s.state} />
                <span>
                  <strong className="font-semibold">{t(s.label)}</strong> <span className="text-fg-muted">— {t(s.hint)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
        {hint && <p className="text-xs italic text-warning">{hint}</p>}
        <p className="text-xs text-fg-muted">
          <a href={GUIDE_URL} target="_blank" rel="noreferrer" className="underline decoration-trim/40 underline-offset-2 hover:text-trim">
            {t('bio.knives.guide.credit')}
          </a>
        </p>
      </div>
    </details>
  )
}

function GuideList({ title, items, numbered = false }: { title: string; items: string[]; numbered?: boolean }) {
  const t = useT()
  return (
    <section>
      <h4 className="mb-1.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-trim">{title}</h4>
      <ol className="max-w-prose space-y-1.5">
        {items.map((key, i) => (
          <li key={key} className="flex gap-2.5">
            <span aria-hidden className="mt-px w-4 shrink-0 text-right font-display text-xs font-bold text-trim/80">
              {numbered ? `${i + 1}.` : '✦'}
            </span>
            <span>{t(`bio.knives.guide.${key}` as TranslationKey)}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

function KnifeItem({ knife }: { knife: Knife }) {
  const t = useT()
  const kind = knife.kind && KIND[knife.kind]
  const frame: Record<KnifeState, string> = {
    drawn: 'border-danger/50 bg-danger/5 shadow-[0_0_22px_-12px_var(--color-danger)]',
    sheathed: 'border-trim/20 bg-surface-2/30',
    healed: 'border-trim/10 opacity-75',
  }
  return (
    <article className={`knife group/knife flex flex-col gap-1.5 rounded-lg border p-3 ${frame[knife.state]}`}>
      <div className="flex items-center justify-between gap-2">
        <Blade state={knife.state} />
        {kind && (
          <span className="truncate text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-fg-muted">
            <span aria-hidden className="mr-1">
              {kind.icon}
            </span>
            {t(kind.label)}
          </span>
        )}
      </div>
      {knife.title && <h4 className="font-display font-bold text-fg">{knife.title}</h4>}
      <div className="text-sm leading-relaxed text-fg/90 [overflow-wrap:anywhere]">{renderObsidianBody(knife.text)}</div>
      {(knife.play || kind) && (
        <details className="group/play mt-auto pt-1">
          <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.12em] text-trim/80 hover:text-trim">
            <span aria-hidden className="mr-1 inline-block transition group-open/play:rotate-90">
              ▸
            </span>
            🎭 {t('bio.knives.play')}
          </summary>
          <div className="mt-1.5 border-l-2 border-trim/40 pl-2.5 text-sm italic leading-relaxed text-fg/85">
            {knife.play ? (
              renderObsidianBody(knife.play)
            ) : (
              <>
                <span className="not-italic text-xs font-semibold uppercase tracking-[0.12em] text-fg-muted">{t('bio.knives.kindTip')}: </span>
                {kind && t(kind.tip)}
              </>
            )}
          </div>
        </details>
      )}
    </article>
  )
}

/**
 * The character's knives ("Knife Theory"): backstory hooks handed to the DM, grouped by where they
 * stand in the campaign, each with a tip on playing it in character, and an explainer for players
 * who meet the idea for the first time.
 */
export function KnivesCard({ knives }: { knives: Knife[] }) {
  const t = useT()
  const groups = STATES.map((s) => ({ ...s, knives: knives.filter((k) => k.state === s.state) })).filter((g) => g.knives.length > 0)
  return (
    <Card title={t('bio.knives')} aside={<Meter count={knives.length} />}>
      <Guide count={knives.length} />
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.state}>
            {groups.length > 1 && (
              <h3 className="mb-2 flex items-baseline gap-2 text-xs">
                <span className={`font-display font-bold uppercase tracking-[0.16em] ${BLADE_TONE[g.state]}`}>{t(g.label)}</span>
                <span className="text-fg-muted">{t(g.hint)}</span>
              </h3>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {g.knives.map((knife, i) => (
                <KnifeItem key={`${i}-${knife.title ?? knife.text}`} knife={knife} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </Card>
  )
}
