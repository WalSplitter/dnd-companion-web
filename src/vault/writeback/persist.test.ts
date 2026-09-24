import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { encodeFieldValue, writeEndeavourInventory, writeFieldValue } from './persist'
import type { FieldWriteTarget } from '../types'

const fixture = `---
InputData:
  ErschöpfungsPunkte: 2
  Zauberplätze:
    Grad_1: 2
---
Body.
`

/** Minimal fake of the File System Access handle surface `writeFieldValue` uses, so the full
 * read -> patch -> write pipeline can be exercised without a real browser. */
function fakeFileHandle(initialContent: string) {
  let content = initialContent
  let pendingWrite: string | undefined
  return {
    handle: {
      getFile: async () => ({ text: async () => content }),
      createWritable: async () => ({
        write: async (data: string) => {
          pendingWrite = data
        },
        close: async () => {
          content = pendingWrite!
        },
      }),
    } as unknown as FileSystemFileHandle,
    getContent: () => content,
  }
}

describe('encodeFieldValue', () => {
  it('writes direct values as-is', () => {
    expect(encodeFieldValue({ path: 'x', keyPath: ['a'] }, 3)).toBe(3)
    expect(encodeFieldValue({ path: 'x', keyPath: ['a'] }, true)).toBe(true)
  })

  it('inverts a used count against max for invert-from-max targets', () => {
    const target: FieldWriteTarget = { path: 'x', keyPath: ['a'], encode: 'invert-from-max', max: 4 }
    expect(encodeFieldValue(target, 1)).toBe(3) // 1 used of 4 -> 3 remaining written to disk
  })
})

describe('writeFieldValue', () => {
  it('reads, patches, and writes back through the file handle', async () => {
    const { handle, getContent } = fakeFileHandle(fixture)
    await writeFieldValue(handle, { path: 'x', keyPath: ['InputData', 'ErschöpfungsPunkte'] }, 4)
    expect(getContent()).toContain('  ErschöpfungsPunkte: 4')
    expect(getContent()).toContain('Body.') // rest of the file untouched
  })

  it('applies invert-from-max encoding before patching', async () => {
    const { handle, getContent } = fakeFileHandle(fixture)
    await writeFieldValue(handle, { path: 'x', keyPath: ['InputData', 'Zauberplätze', 'Grad_1'], encode: 'invert-from-max', max: 4 }, 3)
    expect(getContent()).toContain('    Grad_1: 1') // 3 used of 4 -> 1 remaining
  })

  it('rejects (throws) rather than writing anything when the key path is unrecognized', async () => {
    const { handle, getContent } = fakeFileHandle(fixture)
    await expect(writeFieldValue(handle, { path: 'x', keyPath: ['DoesNotExist'] }, 1)).rejects.toThrow()
    expect(getContent()).toBe(fixture)
  })
})

const inventoryFixture = `---
Charakter: "[[Dummy]]"
endeavour_inventory:
  containers:
    - container: "[[Rucksack (Groß)]]"
      items:
        - "[[Schaufel]]"
---
Inventar zu [[Dummy]].
`

describe('writeEndeavourInventory', () => {
  it('reads, patches, and writes back the whole containers array through the file handle', async () => {
    const { handle, getContent } = fakeFileHandle(inventoryFixture)
    const containers = [{ container: '[[Rucksack (Groß)]]', items: [{ link: '[[Fackel]]', charges: 3 }] }]

    await writeEndeavourInventory(handle, containers)

    const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(getContent())
    const parsed = load(match![1]) as Record<string, unknown>
    expect(parsed.endeavour_inventory).toEqual({ containers })
    expect(getContent()).toContain('Inventar zu [[Dummy]].') // rest of the file untouched
  })
})

describe('writeFieldValue: writes to one file run in order', () => {
  it('keeps both of two concurrent edits to different keys in the same file', async () => {
    const file = fakeFileHandle(fixture)
    await Promise.all([
      writeFieldValue(file.handle, { path: 'x', keyPath: ['InputData', 'ErschöpfungsPunkte'] }, 4),
      writeFieldValue(file.handle, { path: 'x', keyPath: ['InputData', 'Zauberplätze', 'Grad_1'] }, 0),
    ])
    const data = load(file.getContent().split('---')[1]) as { InputData: { ErschöpfungsPunkte: number; Zauberplätze: { Grad_1: number } } }
    expect(data.InputData.ErschöpfungsPunkte).toBe(4)
    expect(data.InputData.Zauberplätze.Grad_1).toBe(0)
  })

  it('still runs later writes after an earlier one fails', async () => {
    const file = fakeFileHandle(fixture)
    const failed = writeFieldValue(file.handle, { path: 'x', keyPath: ['Missing'] }, 1)
    const ok = writeFieldValue(file.handle, { path: 'x', keyPath: ['InputData', 'ErschöpfungsPunkte'] }, 5)
    await expect(failed).rejects.toThrow()
    await ok
    expect(file.getContent()).toContain('ErschöpfungsPunkte: 5')
  })
})
