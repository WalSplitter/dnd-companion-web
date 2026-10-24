/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DICTIONARIES } from '../i18n/useI18n'
import { LEXICON } from './lexicon'
import { ACT_TITLES, MAIN_ACTS, QUESTS } from './questCatalog'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx') ? [path] : []
  })
}

/** Every `data-tour` anchor in the app: fixed ones (`data-tour="x"`), and the prefixes of templated
 * ones (`data-tour={`sheet.tab.${key}`}`), which match any anchor that starts with them. */
function anchorsInSource() {
  const code = sourceFiles(join(process.cwd(), 'src')).map((path) => readFileSync(path, 'utf8'))
  const fixed = new Set(code.flatMap((c) => [...c.matchAll(/data-tour="([\w.-]+)"/g)].map((m) => m[1])))
  const prefixes = code.flatMap((c) => [...c.matchAll(/data-tour=\{`([\w.-]+)\$\{/g)].map((m) => m[1]))
  return (anchor: string) => fixed.has(anchor) || prefixes.some((p) => anchor.startsWith(p))
}

describe('quest catalog', () => {
  it('points every step at an anchor that exists in the app', () => {
    const exists = anchorsInSource()
    const missing = QUESTS.flatMap((q) => q.steps.flatMap((s) => [s.target, s.tab]).filter((a): a is string => !!a && !exists(a)).map((a) => `${q.id}: ${a}`))
    expect(missing).toEqual([])
  })

  it('has unique quest ids and at least one quest per act', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length)
    for (const act of Object.keys(ACT_TITLES)) expect(QUESTS.some((q) => q.act === act)).toBe(true)
    expect(MAIN_ACTS).not.toContain('side')
  })

  it('has a translation for every quest text and lexicon entry in both languages', () => {
    const keys = [
      ...QUESTS.flatMap((q) => [q.title, ...q.steps.map((s) => s.text)]),
      ...Object.values(LEXICON).flatMap((e) => [e.title, ...Object.values(e.body)]),
    ]
    for (const lang of ['en', 'de'] as const) for (const key of keys) expect(DICTIONARIES[lang][key], `${lang}: ${key}`).toBeTruthy()
  })

  it('waits for a click only on a step that has a target', () => {
    for (const q of QUESTS) for (const s of q.steps) if (s.until === 'click') expect(s.target, q.id).toBeTruthy()
  })
})
