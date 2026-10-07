import OBR from '@owlbear-rodeo/sdk'
import { CLAIMS_KEY, loadClaims } from './claims'
import { formatPools } from './formatVitals'
import { readRoster, type LiveRoster } from './live'
import { pageDictionary, translate } from './pageLang'
import { restorePanel } from './panel'

/**
 * Script of `owlbear-mini.html`, the minimized companion: a round button that brings the panel
 * back. A player's own character rings it with their HP (temp HP as a thin cyan arc outside), so a
 * glance still tells how they fare.
 */

const dictionary = pageDictionary()
const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(dictionary, key, values)

const button = document.getElementById('restore') as HTMLButtonElement
const track = document.getElementById('track')!
const hpArc = document.getElementById('hp')!
const tempArc = document.getElementById('temp')!
const spark = document.getElementById('spark')!

const circumference = (arc: Element) => 2 * Math.PI * Number(arc.getAttribute('r'))

function hpColor(share: number): string {
  if (share > 0.5) return '#4ade80'
  if (share > 0.25) return '#f59e0b'
  return '#f87171'
}

function setArc(arc: Element, share: number) {
  const length = circumference(arc)
  arc.setAttribute('stroke-dasharray', `${share * length} ${length}`)
  arc.toggleAttribute('hidden', share <= 0)
}

let roster: LiveRoster = {}

function render() {
  const name = loadClaims().find((n) => roster[n])
  const live = name ? roster[name] : undefined
  const restore = t('owlbear.restorePanel')
  const label = live ? `${restore} — ${name}: ${formatPools(t, live)}` : restore
  button.title = label
  button.setAttribute('aria-label', label)

  const ringed = live !== undefined && live.hpMax > 0
  track.setAttribute('stroke-dasharray', ringed ? 'none' : '1 3.2')
  spark.toggleAttribute('hidden', ringed)
  if (!ringed) {
    hpArc.setAttribute('hidden', '')
    tempArc.setAttribute('hidden', '')
    return
  }
  const share = Math.min(1, Math.max(0, live.hp / live.hpMax))
  hpArc.setAttribute('stroke', hpColor(share))
  setArc(hpArc, share)
  setArc(tempArc, Math.min(1, live.temp / live.hpMax))
}

render()
// The player may claim their character in the panel meanwhile.
window.addEventListener('storage', (e) => {
  if (e.key === CLAIMS_KEY) render()
})

OBR.onReady(() => {
  const take = (metadata: Record<string, unknown>) => {
    roster = readRoster(metadata)
    render()
  }
  void OBR.room.getMetadata().then(take)
  OBR.room.onMetadataChange(take)
  button.addEventListener('click', () => void restorePanel(OBR))
})
