import { describe, expect, it } from 'vitest'
import { cleanObsidianBody, resolveWikilinksInText } from './textClean'

describe('resolveWikilinksInText', () => {
  it('resolves a plain wikilink to its target name', () => {
    expect(resolveWikilinksInText('Siehe [[Feuerball]] für Details.')).toBe('Siehe Feuerball für Details.')
  })

  it('resolves an aliased wikilink to its alias', () => {
    expect(resolveWikilinksInText('Du bist ein [[Zwerge|Zwerg]].')).toBe('Du bist ein Zwerg.')
  })

  it('resolves multiple wikilinks in one string', () => {
    expect(resolveWikilinksInText('[[A]] und [[B|C]]')).toBe('A und C')
  })

  it('leaves plain text without wikilinks untouched', () => {
    expect(resolveWikilinksInText('Kein Link hier.')).toBe('Kein Link hier.')
  })
})

describe('cleanObsidianBody', () => {
  it('drops fenced code blocks (dynamic-embed etc.)', () => {
    const body = '```dynamic-embed\n[[embed Zauber]]\n```\n\n## Beschreibung\nEin Text mit [[Angriffswurf]].'
    expect(cleanObsidianBody(body)).toBe('Ein Text mit Angriffswurf.')
  })

  it('drops heading and blockquote lines, keeps prose', () => {
    const body = '# Titel\n> [!infobox]\n> irrelevant\nDies ist der eigentliche Text.'
    expect(cleanObsidianBody(body)).toBe('Dies ist der eigentliche Text.')
  })

  it('strips list markers and bold markers, collapsing to one paragraph', () => {
    const body = 'Auf höheren Stufen:\n- 5 Stufe: 1W10\n- 11 Stufe: 1W12\n**Wichtig**'
    expect(cleanObsidianBody(body)).toBe('Auf höheren Stufen: 5 Stufe: 1W10 11 Stufe: 1W12 Wichtig')
  })

  it('returns an empty string for a body with nothing but structure', () => {
    expect(cleanObsidianBody('```js-engine\nconsole.log(1)\n```\n# Nur eine Überschrift')).toBe('')
  })
})
