import { beforeEach, describe, expect, it } from 'vitest'
import { formatErrorReport, reportError, useErrorLogStore } from './errorLogStore'

const entries = () => useErrorLogStore.getState().entries

describe('errorLogStore', () => {
  beforeEach(() => useErrorLogStore.getState().clear())

  it('adds one entry per distinct error', () => {
    reportError({ titleKey: 'errorLog.saveFailed', source: 'a', error: new Error('x') })
    reportError({ titleKey: 'errorLog.saveFailed', source: 'b', error: new Error('x') })
    expect(entries()).toHaveLength(2)
  })

  it('folds a repeated identical error into a counter', () => {
    for (let i = 0; i < 3; i++) reportError({ titleKey: 'errorLog.saveFailed', source: 'a', error: new Error('x') })
    expect(entries()).toHaveLength(1)
    expect(entries()[0].count).toBe(3)
  })

  it('keeps only the newest 8 entries', () => {
    for (let i = 0; i < 12; i++) reportError({ title: 't', source: 'a', error: `e${i}` })
    expect(entries()).toHaveLength(8)
    expect(entries()[7].message).toBe('e11')
  })

  it('dismisses a single entry and clears all', () => {
    reportError({ title: 't', source: 'a', error: 'one' })
    reportError({ title: 't', source: 'a', error: 'two' })
    useErrorLogStore.getState().dismiss(entries()[0].id)
    expect(entries().map((e) => e.message)).toEqual(['two'])
    useErrorLogStore.getState().clear()
    expect(entries()).toHaveLength(0)
  })

  it('does not persist the action closure', () => {
    reportError({ title: 't', source: 'a', error: 'x', action: { labelKey: 'errorLog.retry', run: () => {} } })
    const stored = JSON.parse(sessionStorage.getItem('dnd-companion.errorLog') ?? '[]')
    expect(stored[0].action).toBeUndefined()
    expect(stored[0].message).toBe('x')
  })

  it('formats a copyable report with title, source, context and stack', () => {
    reportError({ title: 'T', source: 'vault.x', error: new Error('boom'), context: { path: 'a/b.md' } })
    const report = formatErrorReport(entries()[0], 'Speichern fehlgeschlagen')
    expect(report).toContain('# Speichern fehlgeschlagen')
    expect(report).toContain('source:  vault.x')
    expect(report).toContain('Error: boom')
    expect(report).toContain('"path": "a/b.md"')
    expect(report).toContain('stack:')
  })
})
