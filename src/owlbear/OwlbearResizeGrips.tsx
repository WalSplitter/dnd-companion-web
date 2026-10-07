import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react'
import type OBRType from '@owlbear-rodeo/sdk'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/useI18n'
import { fitPanel, loadPanelPrefs, panelBounds, resizePanel, type PanelBounds } from './panel'
import './resizeGrips.css'

type Obr = typeof OBRType

/** Which way a grip changes the panel: `x` −1 grows it to the left, 1 to the right; `y` 1 downwards. */
interface Axes {
  x: -1 | 0 | 1
  y: 0 | 1
}

interface Drag {
  pointerId: number
  axes: Axes
  startX: number
  startY: number
  startWidth: number
  startHeight: number
  /** The size remembered before — kept on the axis this grip doesn't change (null: the default). */
  kept: Size
  bounds: PanelBounds | null
}

type Size = { width: number | null; height: number | null }

/**
 * Grips to size the panel by hand, for screens of every size: along its inner edge (the width),
 * its bottom (the height) and the corner between them (both). Owlbear lets extensions neither drag
 * nor resize their popovers; the panel sets its own size instead, and Owlbear keeps it at its
 * anchor. A double click returns to the default. The pointer is captured, so dragging on over the
 * map keeps resizing.
 */
export function OwlbearResizeGrips({ obr }: { obr: Obr }) {
  const t = useT()
  const [side] = useState(() => loadPanelPrefs().side)
  const [hud, setHud] = useState<{ width: number; height: number } | null>(null)
  const drag = useRef<Drag | null>(null)
  // One resize at a time; moves meanwhile only keep the latest size.
  const inFlight = useRef(false)
  const queued = useRef<Size | null>(null)

  const inward: Axes['x'] = side === 'right' ? -1 : 1

  const apply = (size: Size, bounds: PanelBounds) => {
    if (inFlight.current) {
      queued.current = size
      return
    }
    inFlight.current = true
    void resizePanel(obr, size, bounds).finally(() => {
      inFlight.current = false
      const next = queued.current
      queued.current = null
      if (next) apply(next, bounds)
    })
  }

  const start = (axes: Axes) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const current: Drag = {
      pointerId: e.pointerId,
      axes,
      startX: e.screenX,
      startY: e.screenY,
      // The page fills the panel, so its size is the panel's.
      startWidth: window.innerWidth,
      startHeight: window.innerHeight,
      kept: { width: loadPanelPrefs().width, height: loadPanelPrefs().height },
      bounds: null,
    }
    drag.current = current
    void panelBounds(obr).then((bounds) => {
      current.bounds = bounds
    })
    const root = document.documentElement
    root.dataset.panelResizing = axes.x && axes.y ? 'both' : axes.x ? 'x' : 'y'
    root.style.setProperty('--panel-resize-cursor', getComputedStyle(e.currentTarget).cursor)
    setHud({ width: current.startWidth, height: current.startHeight })
  }

  const move = (e: ReactPointerEvent<HTMLDivElement>) => {
    const current = drag.current
    if (!current || current.pointerId !== e.pointerId || !current.bounds) return
    // Screen coordinates: the panel itself moves while it grows to the left.
    const width = current.startWidth + current.axes.x * (e.screenX - current.startX)
    const height = current.startHeight + current.axes.y * (e.screenY - current.startY)
    const fitted = fitPanel(width, height, current.bounds)
    setHud(fitted)
    apply({ width: current.axes.x ? fitted.width : current.kept.width, height: current.axes.y ? fitted.height : current.kept.height }, current.bounds)
  }

  const end = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== e.pointerId) return
    drag.current = null
    delete document.documentElement.dataset.panelResizing
    document.documentElement.style.removeProperty('--panel-resize-cursor')
    setHud(null)
  }

  const reset = (axes: Axes) => () => {
    const prefs = loadPanelPrefs()
    void panelBounds(obr).then((bounds) =>
      resizePanel(obr, { width: axes.x ? null : prefs.width, height: axes.y ? null : prefs.height }, bounds),
    )
  }

  /** Arrow keys size the panel too — step by step, Shift for bigger steps. */
  const key = (axes: Axes) => (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 96 : 24
    const dx = axes.x ? { ArrowLeft: -step, ArrowRight: step }[e.key] ?? 0 : 0
    const dy = axes.y ? { ArrowUp: -step, ArrowDown: step }[e.key] ?? 0 : 0
    if (!dx && !dy) return
    e.preventDefault()
    const prefs = loadPanelPrefs()
    void panelBounds(obr).then((bounds) => {
      const fitted = fitPanel(window.innerWidth + axes.x * dx, window.innerHeight + dy, bounds)
      return resizePanel(obr, { width: dx ? fitted.width : prefs.width, height: dy ? fitted.height : prefs.height }, bounds)
    })
  }

  const grip = (axes: Axes, className: string, label: string) => (
    <div
      role="separator"
      aria-orientation={axes.x && !axes.y ? 'vertical' : 'horizontal'}
      aria-label={label}
      title={`${label} — ${t('owlbear.resizeResetHint')}`}
      className={`panel-grip ${className}`}
      onPointerDown={start(axes)}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={reset(axes)}
      onKeyDown={key(axes)}
      tabIndex={0}
    />
  )

  // Into the body: the header they're declared in is a size container, which would anchor them to itself.
  return createPortal(
    <>
      {grip({ x: inward, y: 0 }, `panel-grip-edge panel-grip-${side === 'right' ? 'left' : 'right'}`, t('owlbear.resizeWidth'))}
      {grip({ x: 0, y: 1 }, 'panel-grip-bottom', t('owlbear.resizeHeight'))}
      {grip({ x: inward, y: 1 }, `panel-grip-corner panel-grip-corner-${side === 'right' ? 'left' : 'right'}`, t('owlbear.resizeBoth'))}
      {hud && (
        <div className="panel-size-hud" aria-live="polite">
          {hud.width} <span>×</span> {hud.height}
        </div>
      )}
    </>,
    document.body,
  )
}
