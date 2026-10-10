import { describe, expect, it } from 'vitest'
import { encodeDragPayload, parseGridDrop, parseListDrop } from './dragPayload'

describe('parseGridDrop', () => {
  it('reads back every grid payload it encodes', () => {
    const payloads = [
      { type: 'new', link: '[[Dolch]]' },
      { type: 'move', sourceContainerIndex: 1, sourceLinkIndex: 3 },
      { type: 'equipped', ref: { slot: 'armor' } },
      { type: 'equipped', ref: { slot: 'weapon', position: 0 } },
      { type: 'equipped', ref: { slot: 'ring', position: 1 } },
    ] as const
    for (const payload of payloads) expect(parseGridDrop(encodeDragPayload(payload))).toEqual(payload)
  })

  it('treats anything unrecognized as a plain wikilink', () => {
    expect(parseGridDrop('[[Fackel]]')).toEqual({ type: 'new', link: '[[Fackel]]' })
    expect(parseGridDrop('null')).toEqual({ type: 'new', link: 'null' })
    expect(parseGridDrop('{"type":"move","sourceContainerIndex":"1"}')).toEqual({ type: 'new', link: '{"type":"move","sourceContainerIndex":"1"}' })
  })

  it('rejects an equipped ref without a usable slot', () => {
    const raw = encodeDragPayload({ type: 'equipped', ref: { slot: 'weapon' } as never })
    expect(parseGridDrop(raw)).toEqual({ type: 'new', link: raw })
  })
})

describe('parseListDrop', () => {
  it('reads back every list payload it encodes', () => {
    const payloads = [
      { type: 'list-new', link: '[[Seil aus Hanf]]' },
      { type: 'list-move', section: 'carried', position: 2 },
    ] as const
    for (const payload of payloads) expect(parseListDrop(encodeDragPayload(payload))).toEqual(payload)
  })

  it('ignores anything that is not a list drag', () => {
    expect(parseListDrop('[[Fackel]]')).toBeUndefined()
    expect(parseListDrop('null')).toBeUndefined()
    expect(parseListDrop(encodeDragPayload({ type: 'new', link: '[[Dolch]]' }))).toBeUndefined()
    expect(parseListDrop('{"type":"list-move","section":"backpack","position":0}')).toBeUndefined()
  })
})
