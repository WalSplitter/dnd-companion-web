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
}

const STORAGE_KEY = 'dnd-companion-owlbear-panel'
const DEFAULT_PREFS: PanelPrefs = { side: 'right', size: 'narrow', path: '/' }

const WIDTH: Record<PanelSize, number> = { narrow: 480, wide: 820 }
/** Clear of Owlbear's own controls: the action bar top left, the tools along the right edge and the
 * asset bar at the bottom. */
const MARGIN = 16
const INSET: Record<PanelSide, number> = { left: MARGIN, right: 76 }
const TOP = 72
const BOTTOM = 88

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

/** Opens the panel (or reopens it, e.g. on the other side) as `prefs` describe. */
export async function openPanel(obr: Obr, prefs: PanelPrefs): Promise<void> {
  const [viewWidth, viewHeight] = await Promise.all([obr.viewport.getWidth(), obr.viewport.getHeight()])
  const edge = prefs.side === 'left' ? 'LEFT' : 'RIGHT'
  if (await isPanelOpen(obr)) await obr.popover.close(PANEL_ID)
  await obr.popover.open({
    id: PANEL_ID,
    url: new URL(`${import.meta.env.BASE_URL}${prefs.path.replace(/^\//, '')}`, window.location.origin).href,
    width: Math.min(WIDTH[prefs.size], viewWidth - INSET.left - INSET.right),
    height: Math.max(320, viewHeight - TOP - BOTTOM),
    anchorReference: 'POSITION',
    anchorPosition: { left: prefs.side === 'left' ? INSET.left : viewWidth - INSET.right, top: TOP },
    anchorOrigin: { horizontal: edge, vertical: 'TOP' },
    transformOrigin: { horizontal: edge, vertical: 'TOP' },
    // Stays open while the map, the players list or other extensions are used.
    disableClickAway: true,
    marginThreshold: MARGIN,
  })
}

export function closePanel(obr: Obr): Promise<void> {
  return obr.popover.close(PANEL_ID)
}
