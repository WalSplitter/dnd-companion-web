import { useRef, type CSSProperties, type PointerEvent, type ReactNode, type RefObject } from 'react'

/**
 * A card that tilts toward the pointer and lights up where it is, with a spinning gilded rim on
 * hover. `accent` tints it (any CSS colour). Rendered as a button when it has a single action;
 * `onIntent` fires once the pointer or focus lands on it, to prefetch what that action needs.
 */
export function PortalCard({
  accent,
  onActivate,
  onIntent,
  disabled,
  className = '',
  children,
}: {
  accent: string
  onActivate?: () => void
  onIntent?: () => void
  disabled?: boolean
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  function track(e: PointerEvent) {
    const el = ref.current
    if (!el || e.pointerType !== 'mouse') return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`)
    el.style.setProperty('--ry', `${((x - 0.5) * 7).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 7).toFixed(2)}deg`)
  }

  function reset() {
    ref.current?.style.setProperty('--rx', '0deg')
    ref.current?.style.setProperty('--ry', '0deg')
  }

  const props = {
    className: `portal-card group ${className}`,
    style: { '--portal': accent } as CSSProperties,
    onPointerMove: track,
    onPointerLeave: reset,
    onPointerEnter: onIntent,
    onFocus: onIntent,
  }
  const inner = <div className="portal-card-inner flex h-full flex-col p-5 tall:p-7">{children}</div>

  return onActivate ? (
    <button ref={ref as RefObject<HTMLButtonElement>} type="button" onClick={onActivate} disabled={disabled} {...props}>
      {inner}
    </button>
  ) : (
    <div ref={ref as RefObject<HTMLDivElement>} {...props}>
      {inner}
    </div>
  )
}

export function Emblem({ children }: { children: ReactNode }) {
  return <div className="portal-emblem flex size-12 shrink-0 items-center justify-center rounded-xl [&>svg]:size-7">{children}</div>
}

/** A card's head: its emblem beside the eyebrow and title, so the card spends no height on the emblem. */
export function CardHead({ emblem, eyebrow, eyebrowClass, title }: { emblem: ReactNode; eyebrow: string; eyebrowClass: string; title: ReactNode }) {
  return (
    <div className="flex items-center gap-3.5">
      {emblem}
      <div className="min-w-0 flex-1">
        <p className={`text-[0.7rem] font-bold uppercase tracking-[0.2em] ${eyebrowClass}`}>{eyebrow}</p>
        {title}
      </div>
    </div>
  )
}
