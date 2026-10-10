import type OBR from '@owlbear-rodeo/sdk'
import { isPanelOpen, loadPanelPrefs, openPanel, restorePanel, savePanelPrefs } from './panel'

type Obr = typeof OBR

/** Tells the open companion (on this player's screen only) to show another page. */
export const NAVIGATE_CHANNEL = 'dnd-companion/navigate'

export function isNavigation(value: unknown): value is { path: string } {
  return typeof value === 'object' && value !== null && typeof (value as { path?: unknown }).path === 'string'
}

/** Shows `path` in the companion — opening it, bringing it back from minimized, or just turning the page. */
export async function showInPanel(obr: Obr, path: string): Promise<void> {
  if (!(await isPanelOpen(obr))) {
    await openPanel(obr, savePanelPrefs({ path, minimized: false }))
    return
  }
  savePanelPrefs({ path })
  await obr.broadcast.sendMessage(NAVIGATE_CHANNEL, { path }, { destination: 'LOCAL' })
  if (loadPanelPrefs().minimized) await restorePanel(obr)
}
