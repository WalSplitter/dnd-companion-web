import { create } from 'zustand'
import type { TranslationKey } from '../i18n/useI18n'

const STORAGE_KEY = 'dnd-companion.errorLog'
const MAX_ENTRIES = 8

export interface ErrorLogAction {
  labelKey: TranslationKey
  run: () => void
}

export interface ErrorLogEntry {
  id: number
  /** Translation key for the headline, e.g. `errorLog.saveFailed`. */
  titleKey?: TranslationKey
  /** Literal headline for callers without a key (used when `titleKey` is absent). */
  title?: string
  /** What it means for the user, e.g. "the change was rolled back". */
  hintKey?: TranslationKey
  /** Where it came from, e.g. `vault.setCurrency`. */
  source: string
  message: string
  errorName?: string
  stack?: string
  /** Structured facts that help reproduce/fix it (paths, targets, values). */
  context?: Record<string, unknown>
  time: string
  /** Same title+source+message reported again while still open. */
  count: number
  /** Something the user can do about it. Not persisted across reloads (it's a closure). */
  action?: ErrorLogAction
}

export interface ErrorReportInput {
  titleKey?: TranslationKey
  title?: string
  hintKey?: TranslationKey
  source: string
  error: unknown
  context?: Record<string, unknown>
  action?: ErrorLogAction
}

interface ErrorLogState {
  entries: ErrorLogEntry[]
  report: (input: ErrorReportInput) => void
  dismiss: (id: number) => void
  clear: () => void
}

/** Errors survive a page reload (a load failure is otherwise gone the moment you refresh to retry). */
function loadPersisted(): ErrorLogEntry[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as ErrorLogEntry[]).slice(-MAX_ENTRIES) : []
  } catch {
    return []
  }
}

function persist(entries: ErrorLogEntry[]) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries.map(({ action: _action, ...rest }) => rest)))
  } catch {
    // storage unavailable (private mode, quota) — the log just won't survive a reload
  }
}

const initialEntries = loadPersisted()
let nextId = initialEntries.reduce((max, e) => Math.max(max, e.id), 0) + 1

export const useErrorLogStore = create<ErrorLogState>((set) => {
  const update = (fn: (entries: ErrorLogEntry[]) => ErrorLogEntry[]) =>
    set((state) => {
      const entries = fn(state.entries)
      persist(entries)
      return { entries }
    })

  return {
    entries: initialEntries,
    report: ({ titleKey, title, hintKey, source, error, context, action }) =>
      update((entries) => {
        const message = error instanceof Error ? error.message : String(error)
        const existing = entries.find((e) => e.titleKey === titleKey && e.title === title && e.source === source && e.message === message)
        if (existing) {
          return entries.map((e) => (e.id === existing.id ? { ...e, count: e.count + 1, time: new Date().toISOString(), action: action ?? e.action } : e))
        }
        const entry: ErrorLogEntry = {
          id: nextId++,
          titleKey,
          title,
          hintKey,
          source,
          message,
          errorName: error instanceof Error ? error.name : undefined,
          stack: error instanceof Error ? error.stack : undefined,
          context,
          time: new Date().toISOString(),
          count: 1,
          action,
        }
        return [...entries, entry].slice(-MAX_ENTRIES)
      }),
    dismiss: (id) => update((entries) => entries.filter((e) => e.id !== id)),
    clear: () => update(() => []),
  }
})

/** Non-hook access for store code and global handlers. */
export function reportError(input: ErrorReportInput) {
  useErrorLogStore.getState().report(input)
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Plain-text report meant to be pasted straight into a bug report / chat. `title` is the already
 * translated headline. */
export function formatErrorReport(entry: ErrorLogEntry, title: string): string {
  const lines = [
    `# ${title}`,
    `time:    ${entry.time}${entry.count > 1 ? `  (occurred ${entry.count}x)` : ''}`,
    `source:  ${entry.source}`,
    `error:   ${entry.errorName ? `${entry.errorName}: ` : ''}${entry.message}`,
  ]
  if (entry.context) lines.push('', 'context:', safeJson(entry.context))
  if (entry.stack) lines.push('', 'stack:', entry.stack)
  lines.push('', `url:     ${typeof location !== 'undefined' ? location.href : ''}`, `agent:   ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`)
  return lines.join('\n')
}
