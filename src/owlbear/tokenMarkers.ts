import type OBRType from '@owlbear-rodeo/sdk'
import { buildCurve, buildImage, type AttachmentBehavior, type BoundingBox, type Item, type Vector2 } from '@owlbear-rodeo/sdk'
import { readLink, readRoster, type LiveRoster } from './live'
import { MANA_ARC, arcPoints, markerContent, medalAngles, type MarkerContent } from './markers'
import { MEDAL_SIZE, RING_SIZE, RING_TOKEN_RADIUS } from './rings'
import { readTable, type TableState } from './table'

type Obr = typeof OBRType

const MANA_COLOR = '#4f8cff'
const TRACK = '#0b1020'
/** The markers follow the token around, but neither turn nor scale with it — they're redrawn at a new size instead. */
const DETACHED: AttachmentBehavior[] = ['ROTATION', 'SCALE']
const ringsUrl = new URL(`${import.meta.env.BASE_URL}owlbear-rings/`, window.location.origin).href

/**
 * Draws the markers of linked tokens (see `markers.ts`): a ring per condition over the token's rim —
 * exhaustion innermost, further ones stacked outwards — and the mana as a blue arc on the left. Clash
 * already shows HP beneath the token. The markers are local items attached to the token — every
 * player's background page draws its own, nothing is saved in the scene, and they're hidden with the token.
 */
export function startTokenMarkers(obr: Obr) {
  let roster: LiveRoster = {}
  let table: TableState = {}
  let items: Item[] = []
  /** The markers drawn per token, and what they showed. */
  const placed = new Map<string, { signature: string; ids: string[] }>()
  let running = false
  let again = false

  const render = async () => {
    if (running) {
      again = true
      return
    }
    running = true
    try {
      do {
        again = false
        await draw()
      } while (again)
    } catch {
      // The scene closed meanwhile — the next change draws afresh.
    } finally {
      running = false
    }
  }

  const draw = async () => {
    const wanted = new Map<string, { item: Item; content: MarkerContent; signature: string }>()
    for (const item of items) {
      const link = readLink(item.metadata)
      const content = link && markerContent(roster[link.character], table[link.character])
      if (!content) continue
      wanted.set(item.id, { item, content, signature: JSON.stringify([content, item.scale]) })
    }

    const stale: string[] = []
    for (const [id, { signature, ids }] of placed) {
      if (wanted.get(id)?.signature === signature) continue
      stale.push(...ids)
      placed.delete(id)
    }
    if (stale.length > 0) await obr.scene.local.deleteItems(stale).catch(() => undefined)

    const fresh = [...wanted.entries()].filter(([id]) => !placed.has(id))
    if (fresh.length === 0) return
    const dpi = await obr.scene.grid.getDpi()
    const added: Item[] = []
    for (const [id, { item, content, signature }] of fresh) {
      const markers = build(item.id, await obr.scene.items.getItemBounds([item.id]), content, dpi)
      placed.set(id, { signature, ids: markers.map((marker) => marker.id) })
      added.push(...markers)
    }
    await obr.scene.local.addItems(added)
  }

  const loadScene = async () => {
    if (await obr.scene.isReady()) {
      items = await obr.scene.items.getItems()
    } else {
      // The scene's local items went with it.
      items = []
      placed.clear()
    }
    void render()
  }

  const onRoom = (metadata: Record<string, unknown>) => {
    roster = readRoster(metadata)
    table = readTable(metadata)
    void render()
  }
  void obr.room.getMetadata().then(onRoom)
  obr.room.onMetadataChange(onRoom)
  void loadScene()
  obr.scene.onReadyChange(() => void loadScene())
  obr.scene.items.onChange((next) => {
    items = next
    void render()
  })
}

/** The marker items for a token within `bounds`, on a scene whose grid has `dpi` units per cell. */
function build(tokenId: string, bounds: BoundingBox, content: MarkerContent, dpi: number): Item[] {
  const center = bounds.center
  const radius = Math.min(bounds.width, bounds.height) / 2
  const markers: Item[] = []

  const attach = <T extends { attachedTo(id: string): T; disableAttachmentBehavior(b: AttachmentBehavior[]): T; locked(l: boolean): T; disableHit(d: boolean): T }>(builder: T) =>
    builder.attachedTo(tokenId).disableAttachmentBehavior(DETACHED).locked(true).disableHit(true)

  /** An SVG of `units` × `units` (its own units, drawn at twice that in pixels) centred on `at`, `size` scene units wide. */
  const image = (file: string, units: number, at: Vector2, size: number, zIndex: number) => {
    const pixels = units * 2
    return attach(
      buildImage({ url: `${ringsUrl}${file}`, mime: 'image/svg+xml', width: pixels, height: pixels }, { dpi: pixels, offset: { x: pixels / 2, y: pixels / 2 } })
        .position(at)
        .scale({ x: size / dpi, y: size / dpi })
        .layer('ATTACHMENT')
        .zIndex(zIndex),
    ).build()
  }

  // The ring's token circle matches the token.
  const unit = radius / RING_TOKEN_RADIUS
  const now = Date.now()
  if (content.ring) markers.push(image(content.ring, RING_SIZE, center, RING_SIZE * unit, now))
  // The medallions on the band, above the ring.
  const band = (RING_TOKEN_RADIUS - 2) * unit
  medalAngles(content.medals.length).forEach((angle, i) => {
    const at = { x: center.x + Math.cos((angle * Math.PI) / 180) * band, y: center.y + Math.sin((angle * Math.PI) / 180) * band }
    markers.push(image(content.medals[i], MEDAL_SIZE, at, MEDAL_SIZE * unit, now + 1 + i))
  })

  if (content.mana !== undefined) {
    const stroke = Math.max(4, radius * 0.13)
    // Outside the ring.
    const ring = radius * (content.ring ? 1.12 : 1) + stroke * 0.7
    const arc = (from: number, to: number, color: string, opacity: number, width: number) =>
      attach(
        buildCurve()
          .points(arcPoints(ring, from, to))
          .position(center)
          .strokeColor(color)
          .strokeOpacity(opacity)
          .strokeWidth(width)
          .fillOpacity(0)
          .tension(0)
          .closed(false)
          .layer('ATTACHMENT'),
      ).build()
    const { from, to } = MANA_ARC
    markers.push(arc(from, to, TRACK, 0.7, stroke * 1.35))
    // Fills from the bottom up.
    if (content.mana > 0) markers.push(arc(from, from + (to - from) * content.mana, MANA_COLOR, 1, stroke))
  }
  return markers
}
