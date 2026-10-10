import type OBRType from '@owlbear-rodeo/sdk'
import { buildLine, buildShape, buildText, type Item, type Line, type Shape, type Text, type Vector2 } from '@owlbear-rodeo/sdk'
import { readLink } from './live'
import { ROLL_CHANNEL, aimColor, burstColor, describe, isSharedRoll, type SharedRoll } from './rollMessage'

type Obr = typeof OBRType

/**
 * Shows the rolls companions share (see `rollMessage.ts`) to this player. Attacks and damage play an
 * effect on the roller's tokens — an attack a reticle closing in on the token, damage a burst
 * flaring out of it — with the total beside the token: an attack's on the left, damage on the right.
 * Other rolls, and attacks or damage of a character without a token on the map, come as a
 * notification. The effects are drawn with local items, so each player's background page draws its
 * own copy and nothing is saved in the scene. A hidden roll shows on the GM's screen only.
 */
export function startRollFx(obr: Obr) {
  let isGM = false
  void obr.player.getRole().then((role) => (isGM = role === 'GM'))
  obr.player.onChange((player) => (isGM = player.role === 'GM'))

  const notify = (roll: SharedRoll) => void obr.notification.show(describe(roll), roll.critical ? 'SUCCESS' : roll.fumble ? 'ERROR' : 'DEFAULT')
  obr.broadcast.onMessage(ROLL_CHANNEL, ({ data }) => {
    if (!isSharedRoll(data)) return
    if (data.hidden && !isGM) return
    if (data.kind === 'd20') return notify(data)
    const play = data.kind === 'attack' ? playAim : playBurst
    void linkedTokens(obr, data.character)
      .then((tokens) => (tokens.length > 0 ? Promise.all(tokens.map((token) => play(obr, token, data))) : notify(data)))
      .catch(() => {
        // The scene closed meanwhile — nothing to draw on.
      })
  })
}

const DURATION = 1600
const FRAME = 40
const easeOut = (p: number) => 1 - (1 - p) ** 3
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
/** 0 before `start`, rising to 1 at `end` (fractions of the effect's duration). */
const phase = (p: number, start: number, end = 1) => Math.min(1, Math.max(0, (p - start) / (end - start)))

/** The tokens on the map that show `character` — none while no scene is open. */
async function linkedTokens(obr: Obr, character: string): Promise<Item[]> {
  if (!(await obr.scene.isReady())) return []
  return obr.scene.items.getItems((item: Item) => item.visible && readLink(item.metadata)?.character === character)
}

/** The token's centre and size (its larger side) in scene units. */
async function measure(obr: Obr, token: Item) {
  const bounds = await obr.scene.items.getItemBounds([token.id])
  return { center: bounds.center, size: Math.max(bounds.width, bounds.height) }
}

/** Adds `items` locally, calls `frame` with the progress 0…1 on every frame, then removes them. */
async function animate(obr: Obr, items: Item[], frame: (p: number, draft: Item) => void) {
  const ids = items.map((item) => item.id)
  await obr.scene.local.addItems(items)
  try {
    for (let elapsed = FRAME; elapsed <= DURATION; elapsed += FRAME) {
      await wait(FRAME)
      const p = elapsed / DURATION
      await obr.scene.local.updateItems(ids, (drafts) => {
        for (const draft of drafts) frame(p, draft)
      })
    }
  } finally {
    await obr.scene.local.deleteItems(ids)
  }
}

const circle = (center: Vector2, size: number) =>
  buildShape().shapeType('CIRCLE').width(size).height(size).position(center).layer('ATTACHMENT').locked(true).disableHit(true)

/** The total beside the token, clear of markers other extensions put above it. */
function totalText(roll: SharedRoll, color: string, size: number, position: Vector2, align: 'LEFT' | 'RIGHT', scale: number) {
  return buildText()
    .plainText(roll.critical ? `${roll.total}!` : String(roll.total))
    .textType('PLAIN')
    .width(size * 1.6)
    .height(size)
    .position(position)
    .fontSize(size * 0.7 * scale)
    .fontWeight(900)
    .textAlign(align)
    .textAlignVertical('MIDDLE')
    .fillColor(color)
    .strokeColor('#000000')
    .strokeWidth(size * 0.07)
    .strokeOpacity(1)
    .layer('TEXT')
    .locked(true)
    .disableHit(true)
    .build()
}

function fadeText(draft: Item, opacity: number) {
  const { style } = (draft as Text).text
  style.fillOpacity = opacity
  style.strokeOpacity = opacity
}

/** Damage: a glow and two rings flaring out of the token, the total rising on its right. */
async function playBurst(obr: Obr, token: Item, roll: SharedRoll) {
  const { center, size } = await measure(obr, token)
  const color = burstColor(roll)
  const strength = roll.critical ? 1.4 : 1

  const glow = circle(center, size).fillColor(color).fillOpacity(0.55).strokeWidth(0).strokeOpacity(0).build()
  const ring = circle(center, size).fillOpacity(0).strokeColor(color).strokeOpacity(1).strokeWidth(size * 0.1 * strength).build()
  // A second, thinner wave trails the first.
  const wave = circle(center, size).fillOpacity(0).strokeColor(color).strokeOpacity(0).strokeWidth(size * 0.05 * strength).build()
  const textX = center.x + size * 0.35
  const textTop = center.y - size * 0.75
  const label = totalText(roll, color, size, { x: textX, y: textTop }, 'LEFT', strength)

  await animate(obr, [glow, ring, wave, label], (p, draft) => {
    const first = phase(p, 0, 0.7)
    const second = phase(p, 0.15, 0.85)
    if (draft.id === glow.id) {
      const scale = 1 + 0.6 * easeOut(first)
      draft.scale = { x: scale, y: scale }
      ;(draft as Shape).style.fillOpacity = 0.55 * (1 - first)
    } else if (draft.id === ring.id) {
      const scale = 0.9 + 1.3 * strength * easeOut(first)
      draft.scale = { x: scale, y: scale }
      ;(draft as Shape).style.strokeOpacity = 1 - first
    } else if (draft.id === wave.id) {
      const scale = 0.9 + 1.8 * strength * easeOut(second)
      draft.scale = { x: scale, y: scale }
      ;(draft as Shape).style.strokeOpacity = second > 0 ? 0.8 * (1 - second) : 0
    } else {
      draft.position = { x: textX, y: textTop - size * 0.6 * easeOut(p) }
      fadeText(draft, 1 - phase(p, 0.7))
    }
  })
}

/**
 * Attack: a dashed reticle with four ticks closes in on the token while turning, and flashes as it
 * locks on; the total rises on the token's left. A natural 20 locks on in gold and flashes brighter;
 * a natural 1 drifts off and misses, without a flash.
 */
async function playAim(obr: Obr, token: Item, roll: SharedRoll) {
  const { center, size } = await measure(obr, token)
  const color = aimColor(roll)
  const strength = roll.critical ? 1.4 : 1
  // Where the reticle ends up: on the token, or beside it for a natural 1.
  const miss = roll.fumble ? { x: size * 0.55, y: size * 0.35 } : { x: 0, y: 0 }

  const reticle = circle(center, size * 1.1)
    .fillOpacity(0)
    .strokeColor(color)
    .strokeOpacity(0)
    .strokeWidth(size * 0.06)
    .strokeDash([size * 0.18, size * 0.1])
    .build()
  const flash = circle(center, size).fillColor(color).fillOpacity(0).strokeWidth(0).strokeOpacity(0).build()
  const ticks = [0, 1, 2, 3].map(() =>
    buildLine()
      .startPosition(center)
      .endPosition(center)
      .strokeColor(color)
      .strokeOpacity(0)
      .strokeWidth(size * 0.07)
      .layer('ATTACHMENT')
      .locked(true)
      .disableHit(true)
      .build(),
  )
  const textX = center.x - size * 0.35 - size * 1.6
  const textTop = center.y - size * 0.75
  const label = totalText(roll, color, size, { x: textX, y: textTop }, 'RIGHT', strength)

  await animate(obr, [flash, reticle, ...ticks, label], (p, draft) => {
    const closing = easeOut(phase(p, 0, 0.45))
    const locked = phase(p, 0.45, 0.8)
    const appear = Math.min(1, p * 6) * (1 - phase(p, 0.75))
    const at = { x: center.x + miss.x * closing, y: center.y + miss.y * closing }
    if (draft.id === reticle.id) {
      const scale = 2.4 - 1.4 * closing
      draft.position = at
      draft.scale = { x: scale, y: scale }
      draft.rotation = 90 * closing
      ;(draft as Shape).style.strokeOpacity = appear
    } else if (draft.id === flash.id) {
      const scale = 1 + 0.4 * strength * easeOut(locked)
      draft.scale = { x: scale, y: scale }
      ;(draft as Shape).style.fillOpacity = roll.fumble || locked === 0 ? 0 : Math.min(1, 0.5 * strength) * (1 - locked)
    } else if (draft.id === label.id) {
      draft.position = { x: textX, y: textTop - size * 0.6 * easeOut(p) }
      fadeText(draft, Math.min(1, p * 4) * (1 - phase(p, 0.75)))
    } else {
      // A tick points inwards from the reticle and turns with it.
      const index = ticks.findIndex((tick) => tick.id === draft.id)
      const angle = ((index * 90 + 45 + 90 * closing) * Math.PI) / 180
      const outer = size * (1.5 - 0.75 * closing)
      const inner = outer - size * 0.3
      const line = draft as Line
      line.startPosition = { x: at.x + Math.cos(angle) * outer, y: at.y + Math.sin(angle) * outer }
      line.endPosition = { x: at.x + Math.cos(angle) * inner, y: at.y + Math.sin(angle) * inner }
      line.style.strokeOpacity = appear
    }
  })
}
