import '@fontsource/cinzel/700.css'
import OBR, { type Theme } from '@owlbear-rodeo/sdk'
import type { en } from '../i18n/en'
import { pageDictionary } from './pageLang'
import { closePanel, isPanelOpen, loadPanelPrefs, openPanel, PANEL_ID, restorePanel, savePanelPrefs, type PanelPrefs } from './panel'

/**
 * Script of `owlbear-action.html`, the popover of the toolbar button. A click while the companion
 * is closed opens it and gets out of the way (the page says to wait meanwhile); a click while it's
 * open shows where to dock it.
 */

function applyTheme(theme: Theme) {
  const root = document.documentElement.style
  root.setProperty('--text', theme.text.primary)
  root.setProperty('--muted', theme.text.secondary)
  root.setProperty('--primary', theme.primary.main)
  root.setProperty('--line', theme.mode === 'DARK' ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)')
  root.setProperty('color-scheme', theme.mode === 'DARK' ? 'dark' : 'light')
}

function showPrefs(prefs: PanelPrefs) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-side]')) button.setAttribute('aria-pressed', String(button.dataset.side === prefs.side))
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-size]')) button.setAttribute('aria-pressed', String(prefs.width === null && button.dataset.size === prefs.size))
}

const dictionary = pageDictionary()
for (const el of document.querySelectorAll<HTMLElement>('[data-t]')) el.textContent = dictionary[el.dataset.t as keyof typeof en]

function showLoading(loading: boolean) {
  document.getElementById('loading')!.hidden = !loading
  document.getElementById('controls')!.hidden = loading
}

/** Opens the companion, brings it back from minimized, or — when it's open — shows the controls. */
async function handleClick() {
  if (!(await isPanelOpen(OBR))) {
    await openPanel(OBR, savePanelPrefs({ minimized: false }))
    await OBR.action.close()
    return
  }
  // Minimized: the toolbar button brings it back, too.
  if (loadPanelPrefs().minimized) {
    await restorePanel(OBR)
    await OBR.action.close()
    return
  }
  showPrefs(loadPanelPrefs())
  showLoading(false)
}

/**
 * `handleClick`, but never leaves the popover stuck on its loading screen: should Owlbear fail a
 * request (e.g. still holding on to a panel that closed itself), the panel is cleared away and
 * opened afresh; failing that, the popover closes, so the next click starts over.
 */
let handling = false
async function handleClickSafely() {
  if (handling) return
  handling = true
  showLoading(true)
  try {
    await handleClick()
  } catch {
    try {
      await OBR.popover.close(PANEL_ID).catch(() => undefined)
      await openPanel(OBR, savePanelPrefs({ minimized: false }))
    } finally {
      await OBR.action.close().catch(() => undefined)
    }
  } finally {
    handling = false
  }
}

OBR.onReady(async () => {
  void OBR.theme.getTheme().then(applyTheme)
  OBR.theme.onChange(applyTheme)

  const redock = async (change: Partial<PanelPrefs>) => {
    const prefs = savePanelPrefs(change)
    showPrefs(prefs)
    await openPanel(OBR, prefs)
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-side]')) {
    button.addEventListener('click', () => void redock({ side: button.dataset.side as PanelPrefs['side'] }))
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-size]')) {
    // A preset width replaces one dragged by hand.
    button.addEventListener('click', () => void redock({ size: button.dataset.size as PanelPrefs['size'], width: null }))
  }
  document.getElementById('close')!.addEventListener('click', () => {
    void closePanel(OBR).finally(() => OBR.action.close())
  })

  // Owlbear may keep this page loaded between clicks, so each opening is handled anew.
  OBR.action.onOpenChange((open) => {
    if (open) void handleClickSafely()
  })
  await handleClickSafely()
})
