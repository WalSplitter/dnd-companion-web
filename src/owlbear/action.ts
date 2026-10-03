import OBR, { type Theme } from '@owlbear-rodeo/sdk'
import { de } from '../i18n/de'
import { en } from '../i18n/en'
import { closePanel, isPanelOpen, loadPanelPrefs, openPanel, savePanelPrefs, type PanelPrefs } from './panel'

/**
 * Script of `owlbear-action.html`, the popover of the toolbar button. A click while the companion
 * is closed opens it and gets out of the way; a click while it's open shows where to dock it.
 */

function lang(): 'en' | 'de' {
  try {
    const stored = localStorage.getItem('dnd-companion-lang')
    if (stored === 'en' || stored === 'de') return stored
  } catch {
    // Fall back to the browser's language, as the app does.
  }
  return navigator.language.toLowerCase().startsWith('de') ? 'de' : 'en'
}

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
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-size]')) button.setAttribute('aria-pressed', String(button.dataset.size === prefs.size))
}

// The dictionaries directly, not via `useI18n`, which would pull React into this small page.
const dictionary = lang() === 'de' ? de : en
for (const el of document.querySelectorAll<HTMLElement>('[data-t]')) el.textContent = dictionary[el.dataset.t as keyof typeof en]

OBR.onReady(async () => {
  void OBR.theme.getTheme().then(applyTheme)
  OBR.theme.onChange(applyTheme)

  if (!(await isPanelOpen(OBR))) {
    await openPanel(OBR, loadPanelPrefs())
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
    button.addEventListener('click', () => void redock({ size: button.dataset.size as PanelPrefs['size'] }))
  }
  document.getElementById('close')!.addEventListener('click', () => {
    void closePanel(OBR).then(() => OBR.action.close())
  })
  showPrefs(loadPanelPrefs())
  document.getElementById('controls')!.hidden = false
})
