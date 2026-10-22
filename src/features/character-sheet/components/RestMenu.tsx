import { useId, useLayoutEffect, useRef, useState } from 'react'
import { useDismiss } from '../../../components/useDismiss'
import { useT, type TranslationKey } from '../../../i18n/useI18n'
import { useVaultStore } from '../../../store/vaultStore'
import { useCanEdit } from '../../../store/canEdit'
import type { CharacterFrontmatter } from '../../../vault/types'
import { applyRestChange, planRest, restChangeWrite, restKinds, type RestChange, type RestKind } from '../rest'

/** A campfire: two logs and a flame that flickers (see `.rest-flame`). */
function CampfireIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden>
      <path className="rest-flame" d="M12 2.8c.5 2.6 3.9 4.4 3.9 8.3a3.9 3.9 0 0 1-7.8 0c0-2 1-3.1 1.9-4.1.2 1.3.7 2.1 1.6 2.5-.4-2.7-.1-4.6.4-6.7Z" fill="currentColor" />
      <path d="M4 20.5 20 16.5M4 16.5l16 4" stroke="color-mix(in srgb, var(--color-trim) 80%, var(--color-fg-muted))" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

const REST_TITLE: Record<RestKind, TranslationKey> = {
  breather: 'rest.breather',
  field: 'rest.field',
  safe: 'rest.safe',
  long: 'rest.long',
}
const REST_TERMS: Record<RestKind, TranslationKey> = {
  breather: 'rest.breatherTerms',
  field: 'rest.fieldTerms',
  safe: 'rest.safeTerms',
  long: 'rest.longTerms',
}

/**
 * The "Rest" button in the vitals header and its menu: one card per rest the character's rules
 * offer (see `rest.ts`), each listing exactly which pools it would change, from → to. Picking one
 * writes all of them. Only pools that can be saved are listed, so what you see is what happens.
 */
export function RestMenu({ character, characterPath }: { character: CharacterFrontmatter; characterPath: string }) {
  const t = useT()
  const menuId = useId()
  const canEdit = useCanEdit()
  const updateCharacterField = useVaultStore((s) => s.updateCharacterField)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  // Left offset (px, relative to the trigger's box) that keeps the panel on screen: right-aligned to
  // the trigger where it fits, otherwise pushed in so it keeps a 16px gutter (narrow phones).
  const [panelLeft, setPanelLeft] = useState<number | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    function place() {
      const container = containerRef.current
      const panel = panelRef.current
      if (!container || !panel) return
      const box = container.getBoundingClientRect()
      const width = panel.offsetWidth
      const gutter = 16
      const viewport = document.documentElement.clientWidth
      const left = Math.max(gutter, Math.min(box.right - width, viewport - gutter - width))
      setPanelLeft(left - box.left)
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [open])

  useDismiss(open, () => setOpen(false), [containerRef])

  const plans = restKinds(character).map((kind) => ({
    kind,
    changes: planRest(character, kind).filter((change) => restChangeWrite(change, character._write)),
  }))

  async function rest(changes: RestChange[]) {
    setOpen(false)
    // One after another: several pools may live in the same file.
    for (const change of changes) {
      const write = restChangeWrite(change, character._write)
      if (write) await updateCharacterField(characterPath, write.target, write.value, (c) => applyRestChange(c, change))
    }
  }

  const changeLabel = (change: RestChange): string => {
    switch (change.key) {
      case 'resilience':
        return t('stats.resilience')
      case 'hp':
        return t('cards.hitPoints')
      case 'temp':
        return t('stats.tempHp')
      case 'mana':
        return t('stats.mana')
      case 'exhaustion':
        return t('stats.exhaustion')
      case 'slot':
        return t('spells.slotLevelLabel', { level: change.grade ?? '' })
      case 'hitDice':
        return t('stats.hitDice')
      case 'resource':
        return change.resource?.name ?? ''
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        className="rest-trigger"
        aria-expanded={open}
        aria-controls={menuId}
        title={canEdit ? t('rest.tooltip') : t('rest.readOnly')}
        onClick={() => setOpen((o) => !o)}
      >
        <CampfireIcon />
        {t('rest.button')}
      </button>

      {open && (
        <div
          id={menuId}
          ref={panelRef}
          role="dialog"
          aria-label={t('rest.title')}
          style={panelLeft === null ? { right: 0 } : { left: panelLeft }}
          className="rpg-panel absolute top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] bg-surface p-3 shadow-xl"
        >
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <span className="font-display text-sm font-bold tracking-wide text-fg">{t('rest.title')}</span>
            {!canEdit && <span className="text-[0.65rem] text-danger">{t('rest.readOnly')}</span>}
          </div>
          <div className="space-y-2">
            {plans.map(({ kind, changes }) => (
              <button key={kind} type="button" className="rest-option" disabled={!canEdit || changes.length === 0} onClick={() => void rest(changes)}>
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-fg">{t(REST_TITLE[kind])}</span>
                  <span className="text-[0.65rem] text-fg-muted">{t(REST_TERMS[kind])}</span>
                </span>
                {changes.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {changes.map((change) => (
                      <span
                        key={`${change.key}-${change.grade ?? change.resource?.key ?? ''}`}
                        className="inline-flex items-baseline gap-1 rounded bg-black/20 px-1.5 py-0.5 text-[0.7rem] text-fg-muted"
                      >
                        {changeLabel(change)}
                        <span className="font-num text-fg">
                          {change.from} → <span className={(change.key === 'exhaustion' ? change.to < change.from : change.to > change.from) ? 'text-success' : 'text-warning'}>{change.to}</span>
                        </span>
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[0.7rem] italic text-fg-muted">{t('rest.nothing')}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
