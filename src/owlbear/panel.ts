import type OBR from '@owlbear-rodeo/sdk'

/**
 * The app runs in Owlbear as a popover of its own rather than as the toolbar action's popover:
 * Owlbear shows only one action popover at a time, so the players list (and other extensions)
 * would close the sheet. Owlbear's popovers can't be dragged, so the panel docks to a side instead.
 */
export const PANEL_ID = 'dnd-companion/panel'

export type PanelSide = 'left' | 'right'
export type PanelSize = 'narrow' | 'wide'

export interface PanelPrefs {
  side: PanelSide
  size: PanelSize
  /** The route the panel showed last, so docking it elsewhere (which reloads it) comes back there. */
  path: string
  /** Collapsed to a button; the page stays loaded underneath. */
  minimized: boolean
  /** Width and height dragged by hand (see `OwlbearResizeGrips`) — null for `size`'s width and the
   * window's full height. Fitted into the window whenever it changes. */
  width: number | null
  height: number | null
  /** The address the open panel was loaded from. Moving it means opening it again with this very
   * address, which keeps the page as it is. */
  url: string | null
}

const STORAGE_KEY = 'dnd-companion-owlbear-panel'
const DEFAULT_PREFS: PanelPrefs = { side: 'right', size: 'narrow', path: '/', minimized: false, width: null, height: null, url: null }

const WIDTH: Record<PanelSize, number> = { narrow: 480, wide: 820 }
/** Clear of Owlbear's own controls: the action bar top left, the tools along the right edge and the
 * asset bar at the bottom. */
const MARGIN = 16
const INSET: Record<PanelSide, number> = { left: MARGIN, right: 76 }
/**
 * Where the panel starts. Docked right, level with the top of Owlbear's button that collapses its
 * tools (its top about 11 px below the window's, its centre about 29 px); docked left, below the
 * action bar in the top left corner.
 */
const TOP: Record<PanelSide, number> = { left: 72, right: 11 }
const BOTTOM = 88
/** How close Owlbear may push the panel to the window's edges, e.g. while the window shrinks. */
const EDGE = 8
/**
 * Minimized, the panel shrinks to nothing (it stays loaded, so it comes back as it was) and a small
 * popover of its own, `owlbear-mini.html`, shows a round button instead — level with Owlbear's
 * button that collapses its tools, just left of it, wherever the panel is docked.
 */
export const MINI_ID = 'dnd-companion/mini'
/** The button's frame: a 40 px circle with room for its glow. */
const MINI_SIZE = 44
/** Centred on Owlbear's collapse button. */
const MINI_TOP = 7
/** The circle's right edge in line with the panel's. */
const MINI_RIGHT = INSET.right - 2
/** The smallest the panel can be dragged to — the sheet still reads at this size. */
const MIN_WIDTH = 320
const MIN_HEIGHT = 240

export function loadPanelPrefs(): PanelPrefs {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return { ...DEFAULT_PREFS, ...(JSON.parse(stored) as Partial<PanelPrefs>) }
  } catch {
    // Storage unavailable or garbled — the defaults will do.
  }
  return DEFAULT_PREFS
}

export function savePanelPrefs(change: Partial<PanelPrefs>): PanelPrefs {
  const prefs = { ...loadPanelPrefs(), ...change }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    // Not remembered then; the panel still opens.
  }
  return prefs
}

type Obr = typeof OBR

export async function isPanelOpen(obr: Obr): Promise<boolean> {
  try {
    return (await obr.popover.getWidth(PANEL_ID)) !== undefined
  } catch {
    return false
  }
}

export interface PanelBounds {
  minWidth: number
  maxWidth: number
  minHeight: number
  maxHeight: number
}

/** How small and large the panel may be in a viewport of `viewWidth` × `viewHeight`: clear of
 * Owlbear's controls, never smaller than the minimum unless the window is. */
function boundsIn(side: PanelSide, viewWidth: number, viewHeight: number): PanelBounds {
  const maxWidth = Math.max(200, viewWidth - INSET.left - INSET.right)
  const maxHeight = Math.max(MIN_HEIGHT, viewHeight - TOP[side] - BOTTOM)
  return { minWidth: Math.min(MIN_WIDTH, maxWidth), maxWidth, minHeight: MIN_HEIGHT, maxHeight }
}

export async function panelBounds(obr: Obr): Promise<PanelBounds> {
  const [viewWidth, viewHeight] = await Promise.all([obr.viewport.getWidth(), obr.viewport.getHeight()])
  return boundsIn(loadPanelPrefs().side, viewWidth, viewHeight)
}

const clamp = (value: number, min: number, max: number) => Math.round(Math.min(max, Math.max(min, value)))

/** `width` × `height` fitted into `bounds`. */
export function fitPanel(width: number, height: number, bounds: PanelBounds) {
  return { width: clamp(width, bounds.minWidth, bounds.maxWidth), height: clamp(height, bounds.minHeight, bounds.maxHeight) }
}

/** Size of the panel in a viewport of `viewWidth` × `viewHeight`. */
function layout(prefs: PanelPrefs, viewWidth: number, viewHeight: number) {
  if (prefs.minimized) return { width: 0, height: 0 }
  const bounds = boundsIn(prefs.side, viewWidth, viewHeight)
  return fitPanel(prefs.width ?? WIDTH[prefs.size], prefs.height ?? bounds.maxHeight, bounds)
}

/**
 * Puts the panel where `prefs` say, for a window `viewWidth` wide. Owlbear places a popover in
 * pixels, so docked right this is redone whenever the window's width changes — with the address
 * the panel was loaded from, which Owlbear takes as the same popover and leaves the page alone.
 */
function place(obr: Obr, prefs: PanelPrefs, url: string, viewWidth: number, viewHeight: number): Promise<void> {
  const edge = prefs.side === 'left' ? 'LEFT' : 'RIGHT'
  return obr.popover.open({
    id: PANEL_ID,
    url,
    ...layout(prefs, viewWidth, viewHeight),
    anchorReference: 'POSITION',
    anchorPosition: { left: prefs.side === 'left' ? INSET.left : viewWidth - INSET.right, top: TOP[prefs.side] },
    anchorOrigin: { horizontal: edge, vertical: 'TOP' },
    transformOrigin: { horizontal: edge, vertical: 'TOP' },
    // Stays open while the map, the players list or other extensions are used.
    disableClickAway: true,
    marginThreshold: EDGE,
  })
}

/** Opens the panel (or reopens it, e.g. on the other side, which reloads it) as `prefs` describe. */
export async function openPanel(obr: Obr, prefs: PanelPrefs): Promise<void> {
  const [viewWidth, viewHeight] = await Promise.all([obr.viewport.getWidth(), obr.viewport.getHeight()])
  if (await isPanelOpen(obr)) await obr.popover.close(PANEL_ID)
  const url = new URL(`${import.meta.env.BASE_URL}${prefs.path.replace(/^\//, '')}`, window.location.origin).href
  await place(obr, savePanelPrefs({ url }), url, viewWidth, viewHeight)
}

/**
 * Fits the open panel to the window while it is resized — without reloading it (which would lose
 * a sign-in the browser keeps no storage for, as in a private window): a new size is set, a new
 * width moves it, too, beside the tools. Runs on the background page, as the panel can't see
 * Owlbear's window; polls, as the SDK reports no resizing.
 */
export function keepPanelInView(obr: Obr) {
  let busy = false
  /** The window width the panel and the minimized button were placed for. */
  let placedFor: number | null = null
  let miniPlacedFor: number | null = null
  /** The width seen on the last tick: the panel moves once the width has held for a tick. */
  let lastWidth: number | null = null
  const check = async () => {
    if (busy) return
    busy = true
    try {
      const [viewWidth, viewHeight, width, height, miniWidth] = await Promise.all([
        obr.viewport.getWidth(),
        obr.viewport.getHeight(),
        obr.popover.getWidth(PANEL_ID),
        obr.popover.getHeight(PANEL_ID),
        obr.popover.getWidth(MINI_ID),
      ])
      const settled = viewWidth === lastWidth
      lastWidth = viewWidth
      const prefs = loadPanelPrefs()
      const wantMini = prefs.minimized && width !== undefined
      if (wantMini && (miniWidth === undefined || miniPlacedFor !== viewWidth)) {
        await openMini(obr, viewWidth)
        miniPlacedFor = viewWidth
      } else if (!wantMini && miniWidth !== undefined) {
        await obr.popover.close(MINI_ID)
        miniPlacedFor = null
      }
      if (width === undefined || height === undefined) {
        placedFor = null
        return
      }
      // Opened at this width (by the toolbar button) — nothing to move yet.
      if (placedFor === null) placedFor = viewWidth
      if (placedFor !== viewWidth && settled && prefs.side === 'right' && prefs.url) {
        await place(obr, prefs, prefs.url, viewWidth, viewHeight)
        placedFor = viewWidth
        return
      }
      const target = layout(prefs, viewWidth, viewHeight)
      if (target.width !== width) await obr.popover.setWidth(PANEL_ID, target.width)
      if (target.height !== height) await obr.popover.setHeight(PANEL_ID, target.height)
    } catch {
      // The room went away — the next tick tries again.
    } finally {
      busy = false
    }
  }
  setInterval(() => void check(), 150)
}

/** Opens the minimized panel's button beside Owlbear's collapse button (see `MINI_ID`). */
async function openMini(obr: Obr, viewWidth: number): Promise<void> {
  await obr.popover.open({
    id: MINI_ID,
    url: new URL(`${import.meta.env.BASE_URL}owlbear-mini.html`, window.location.origin).href,
    width: MINI_SIZE,
    height: MINI_SIZE,
    anchorReference: 'POSITION',
    anchorPosition: { left: viewWidth - MINI_RIGHT, top: MINI_TOP },
    anchorOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
    transformOrigin: { horizontal: 'RIGHT', vertical: 'TOP' },
    // A round button of its own instead of Owlbear's rectangular card.
    hidePaper: true,
    disableClickAway: true,
    marginThreshold: 0,
  })
}

/** Collapses the panel to a round button beside Owlbear's tools; the page stays loaded. */
export async function minimizePanel(obr: Obr): Promise<void> {
  savePanelPrefs({ minimized: true })
  const viewWidth = await obr.viewport.getWidth()
  await openMini(obr, viewWidth)
  await Promise.all([obr.popover.setWidth(PANEL_ID, 0), obr.popover.setHeight(PANEL_ID, 0)])
}

/** Brings the minimized panel back as it was — or opens it again, should it have been closed. */
export async function restorePanel(obr: Obr): Promise<void> {
  const prefs = savePanelPrefs({ minimized: false })
  if (await isPanelOpen(obr)) {
    const [viewWidth, viewHeight] = await Promise.all([obr.viewport.getWidth(), obr.viewport.getHeight()])
    const { width, height } = layout(prefs, viewWidth, viewHeight)
    await Promise.all([obr.popover.setWidth(PANEL_ID, width), obr.popover.setHeight(PANEL_ID, height)])
  } else {
    await openPanel(obr, prefs)
  }
  await obr.popover.close(MINI_ID)
}

export async function closePanel(obr: Obr): Promise<void> {
  savePanelPrefs({ minimized: false })
  await Promise.all([obr.popover.close(PANEL_ID), obr.popover.close(MINI_ID)])
}

/**
 * Sets the panel to `width` × `height` (null: back to the default) and remembers it — saved first,
 * so the background page fitting the panel to the window (`keepPanelInView`) agrees. Owlbear keeps
 * it at its anchor: docked right, it grows to the left.
 */
export async function resizePanel(obr: Obr, size: { width: number | null; height: number | null }, bounds: PanelBounds): Promise<void> {
  const prefs = savePanelPrefs(size)
  const fitted = fitPanel(prefs.width ?? WIDTH[prefs.size], prefs.height ?? bounds.maxHeight, bounds)
  await Promise.all([obr.popover.setWidth(PANEL_ID, fitted.width), obr.popover.setHeight(PANEL_ID, fitted.height)])
}
