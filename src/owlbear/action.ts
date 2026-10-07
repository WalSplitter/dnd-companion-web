import '@fontsource/cinzel/700.css'
import OBR, { type Theme } from '@owlbear-rodeo/sdk'
import type { en } from '../i18n/en'
import { pageDictionary } from './pageLang'
import { closePanel, isPanelOpen, loadPanelPrefs, openPanel, restorePanel, savePanelPrefs, type PanelPrefs } from './panel'

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

OBR.onReady(async () => {
  void OBR.theme.getTheme().then(applyTheme)
  OBR.theme.onChange(applyTheme)

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
    void closePanel(OBR).then(() => OBR.action.close())
  })
  showPrefs(loadPanelPrefs())
  document.getElementById('loading')!.hidden = true
  document.getElementById('controls')!.hidden = false
})
