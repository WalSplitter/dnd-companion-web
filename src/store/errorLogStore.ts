import { create } from 'zustand'

export interface ErrorLogEntry {
  id: number
  /** Short headline, e.g. "Speichern fehlgeschlagen". */
  title: string
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
}

interface ErrorLogState {
  entries: ErrorLogEntry[]
  report: (input: { title: string; source: string; error: unknown; context?: Record<string, unknown> }) => void
  dismiss: (id: number) => void
  clear: () => void
}

let nextId = 1

export const useErrorLogStore = create<ErrorLogState>((set) => ({
  entries: [],
  report: ({ title, source, error, context }) =>
    set((state) => {
      const message = error instanceof Error ? error.message : String(error)
      const existing = state.entries.find((e) => e.title === title && e.source === source && e.message === message)
      if (existing) {
        return { entries: state.entries.map((e) => (e.id === existing.id ? { ...e, count: e.count + 1, time: new Date().toISOString() } : e)) }
      }
      const entry: ErrorLogEntry = {
        id: nextId++,
        title,
        source,
        message,
        errorName: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
        context,
        time: new Date().toISOString(),
        count: 1,
      }
      return { entries: [...state.entries, entry].slice(-8) }
    }),
  dismiss: (id) => set((state) => ({ entries: state.entries.filter((e) => e.id !== id) })),
  clear: () => set({ entries: [] }),
}))

/** Non-hook access for store code and global handlers. */
export function reportError(input: Parameters<ErrorLogState['report']>[0]) {
  useErrorLogStore.getState().report(input)
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** Plain-text report meant to be pasted straight into a bug report / chat. */
export function formatErrorReport(entry: ErrorLogEntry, title = entry.title): string {
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
