import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { useT } from '../i18n/useI18n'
import { CONDITION_STYLES, conditionIcon } from '../owlbear/rings'
import { CONDITIONS } from '../owlbear/table'

/** A chip tinted with the condition's ring colour, mixed into the theme so it reads on light and dark ones. */
function tint(condition: string): CSSProperties {
  const color = CONDITION_STYLES[condition]?.color ?? 'var(--color-trim)'
  return {
    borderColor: `color-mix(in srgb, ${color} 65%, transparent)`,
    background: `color-mix(in srgb, ${color} 24%, transparent)`,
  }
}

const CHIP = 'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold text-fg'

/**
 * Conditions as chips with the emblem of their token ring, tinted in its colour — removable, plus a
 * "+ Condition" chip that opens a menu of the others, given `onChange`.
 */
export function ConditionChips({ conditions, onChange }: { conditions: string[]; onChange?: (next: string[]) => void }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const available = CONDITIONS.filter((c) => !conditions.includes(c))

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!onChange && conditions.length === 0) return null

  return (
    <div ref={rootRef} className="relative flex flex-wrap items-center gap-1.5">
      {conditions.map((condition) => (
        <span key={condition} className={CHIP} style={tint(condition)}>
          <span aria-hidden>{conditionIcon(condition)}</span>
          {condition}
          {onChange && (
            <button
              type="button"
              aria-label={t('owlbear.removeCondition', { name: condition })}
              title={t('owlbear.removeCondition', { name: condition })}
              className="-mr-1 flex size-4 items-center justify-center rounded-full text-fg-muted transition hover:bg-fg/10 hover:text-fg"
              onClick={() => onChange(conditions.filter((c) => c !== condition))}
            >
              <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
                <path d="M3 3l6 6M9 3l-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </span>
      ))}

      {onChange && available.length > 0 && (
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-label={t('owlbear.addCondition')}
          onClick={() => setOpen((o) => !o)}
          className={`${CHIP} border-dashed border-trim/45 text-trim transition hover:border-trim hover:bg-trim/10 ${open ? 'border-trim bg-trim/10' : ''}`}
        >
          <svg viewBox="0 0 12 12" className="size-2.5" aria-hidden>
            <path d="M6 2v8M2 6h8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          {t('owlbear.condition')}
        </button>
      )}

      {open && onChange && (
        <ul
          role="listbox"
          aria-label={t('owlbear.addCondition')}
          className="vault-nav-menu absolute left-0 top-full z-20 mt-2 grid max-h-72 w-80 max-w-[85vw] grid-cols-2 gap-0.5 overflow-y-auto rounded-xl p-1.5"
        >
          {available.map((condition) => (
            <li key={condition} role="option" aria-selected={false}>
              <button
                type="button"
                onClick={() => {
                  onChange([...conditions, condition])
                  if (available.length === 1) setOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-fg transition hover:bg-trim/10"
              >
                <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs" style={tint(condition)}>
                  {conditionIcon(condition)}
                </span>
                <span className="truncate">{condition}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
