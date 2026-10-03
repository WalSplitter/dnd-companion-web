/// <reference types="node" />
// Read from disk: Vitest doesn't process CSS, so `import.meta.glob(..., { query: '?raw' })` yields
// empty strings here.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return cssFiles(path)
    return entry.name.endsWith('.css') ? [path] : []
  })
}

/**
 * Guards the mobile scroll performance: an endless animation must only change properties the GPU
 * can animate on its own. Anything else (background-position, box-shadow, filter, text-shadow ...)
 * repaints its whole area every frame, and a handful of those made scrolling lag on phones. Such an
 * animation may still run where it is limited to devices with a hovering pointer (desktop), or when
 * it is listed below with the reason it is acceptable.
 */
const COMPOSITED = new Set(['opacity', 'transform', 'translate', 'rotate', 'scale'])

/** Keyframes that may animate other properties endlessly, and why that is fine. */
const ALLOWED: Record<string, string> = {
  'title-sheen': 'one headline on the start page; its gradient is clipped to the text, so it cannot move as a layer',
  'portal-spin': 'only runs while a start page card is hovered or focused',
  'drop-breathe': 'only shown while a vault folder is dragged onto the start page',
}

interface CssBlock {
  /** Selector or at-rule prelude, e.g. `.mana-fill` or `@media (hover: hover)`. */
  prelude: string
  body: string
  /** Preludes of the enclosing at-rules, outermost first. */
  context: string[]
}

/** Splits a stylesheet into its innermost blocks, remembering the at-rules around each one. */
function parseBlocks(css: string): CssBlock[] {
  const source = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const blocks: CssBlock[] = []
  const stack: { prelude: string; start: number }[] = []
  let segmentStart = 0
  for (let i = 0; i < source.length; i++) {
    const ch = source[i]
    if (ch === '{') {
      stack.push({ prelude: source.slice(segmentStart, i).trim(), start: i + 1 })
      segmentStart = i + 1
    } else if (ch === '}') {
      const open = stack.pop()
      if (open) {
        blocks.push({ prelude: open.prelude, body: source.slice(open.start, i), context: stack.map((s) => s.prelude) })
      }
      segmentStart = i + 1
    } else if (ch === ';') {
      segmentStart = i + 1
    }
  }
  return blocks
}

/** Properties each `@keyframes` block animates, by name. */
function keyframeProperties(blocks: CssBlock[]): Map<string, Set<string>> {
  const props = new Map<string, Set<string>>()
  for (const block of blocks) {
    // Steps (`0%`, `to` ...) are the innermost blocks; their keyframes rule is the last context entry.
    const outer = block.context.at(-1)
    const name = outer?.match(/^@keyframes\s+([\w-]+)/)?.[1]
    if (!name) continue
    const set = props.get(name) ?? new Set<string>()
    for (const [, prop] of block.body.matchAll(/(?:^|;)\s*([a-z-]+)\s*:/g)) set.add(prop)
    props.set(name, set)
  }
  return props
}

interface EndlessAnimation {
  file: string
  selector: string
  keyframes: string
  context: string[]
}

/** Every `animation:` shorthand entry that repeats forever. */
function endlessAnimations(file: string, blocks: CssBlock[]): EndlessAnimation[] {
  return blocks.flatMap((block) =>
    [...block.body.matchAll(/(?:^|;)\s*animation\s*:([^;]+)/g)].flatMap(([, value]) =>
      value
        .split(/,(?![^(]*\))/)
        .filter((entry) => /\binfinite\b/.test(entry))
        .flatMap((entry) => {
          const name = entry.trim().split(/\s+/)[0]
          return name ? [{ file, selector: block.prelude, keyframes: name, context: block.context }] : []
        }),
    ),
  )
}

const desktopOnly = (context: string[]) => context.some((c) => /\(hover:\s*hover\)/.test(c))

/** `file: selector -> @keyframes name animates props` for every endless animation that repaints. */
function findRepaintingAnimations(sheets: { file: string; css: string }[], allowed: Record<string, string>): string[] {
  const parsed = sheets.map(({ file, css }) => ({ file, blocks: parseBlocks(css) }))
  const keyframes = keyframeProperties(parsed.flatMap((s) => s.blocks))
  return parsed
    .flatMap((s) => endlessAnimations(s.file, s.blocks))
    .flatMap(({ file, selector, keyframes: name, context }) => {
      const repainting = [...(keyframes.get(name) ?? [])].filter((p) => !COMPOSITED.has(p))
      if (repainting.length === 0 || desktopOnly(context) || name in allowed) return []
      return [`${file}: ${selector} -> @keyframes ${name} animates ${repainting.join(', ')}`]
    })
}

describe('endless animations', () => {
  const root = process.cwd()
  const sheets = cssFiles(join(root, 'src')).map((path) => ({ file: relative(root, path), css: readFileSync(path, 'utf8') }))

  it('reads the stylesheets', () => {
    expect(sheets.length).toBeGreaterThan(10)
    expect(sheets.filter((s) => s.css.trim() === '').map((s) => s.file)).toEqual([])
  })

  it('animate only GPU-composited properties, unless limited to desktop or explicitly allowed', () => {
    expect(findRepaintingAnimations(sheets, ALLOWED)).toEqual([])
  })

  it('allow only keyframes that still exist', () => {
    const all = sheets.map((s) => s.css).join('\n')
    expect(Object.keys(ALLOWED).filter((name) => !new RegExp(`@keyframes\\s+${name}\\b`).test(all))).toEqual([])
  })

  it('catches a repainting animation, but not a composited, desktop-only or one-shot one', () => {
    const css = `
      /* a comment { with braces } */
      @keyframes glow { 50% { box-shadow: 0 0 8px red; opacity: .5; } }
      @keyframes bob { to { translate: 0 4px; } }
      .bad { animation: bob 2s infinite, glow 3s ease-in-out infinite; }
      .fine { animation: bob 2s linear infinite; }
      .once { animation: glow 400ms ease-out both; }
      @media (prefers-reduced-motion: no-preference) and (hover: hover) { .desk { animation: glow 3s infinite; } }
    `
    expect(findRepaintingAnimations([{ file: 'x.css', css }], {})).toEqual(['x.css: .bad -> @keyframes glow animates box-shadow'])
  })
})
