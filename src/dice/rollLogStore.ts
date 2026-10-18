import { createContext, useContext } from 'react'
import { create } from 'zustand'
import type { RollMode } from './notation'

const MAX_ENTRIES = 30

export interface RollLogEntry {
  id: number
  /** `Date.now()` when it was rolled. */
  at: number
  /** Whose sheet it was rolled on (see `RollerContext`); empty outside a sheet. */
  character: string
  kind: 'd20' | 'damage'
  label: string
  total: number
  rolls: number[]
  /** The roll's own bonus, exhaustion already taken off (as in the result popover). */
  modifier: number
  /** Exhaustion penalty taken off a d20 roll, shown apart from the bonus. */
  penalty?: number
  mode?: RollMode
  critical?: boolean
  fumble?: boolean
  /** What the result means in play, e.g. the action points of an initiative roll. */
  effect?: string
}

export type RollLogInput = Omit<RollLogEntry, 'id' | 'at' | 'character'>

interface RollLogState {
  /** Newest first. Kept in memory only: a log of this session's table, not of the character. */
  entries: RollLogEntry[]
  /** Advantage/disadvantage chosen in the log for the next d20 roll — the touch-screen stand-in
   * for Shift/Alt+click. Falls back to `normal` once that roll is made. */
  armedMode: RollMode
  add: (character: string, entry: RollLogInput) => void
  clear: () => void
  setArmedMode: (mode: RollMode) => void
}

let nextId = 1

export const useRollLogStore = create<RollLogState>()((set) => ({
  entries: [],
  armedMode: 'normal',
  add: (character, entry) =>
    set((s) => ({ entries: [{ ...entry, id: nextId++, at: Date.now(), character }, ...s.entries].slice(0, MAX_ENTRIES) })),
  clear: () => set({ entries: [] }),
  setArmedMode: (armedMode) => set({ armedMode }),
}))

/** Name of the character whose sheet the roll buttons sit on — labels the log's entries. */
export const RollerContext = createContext('')

export function useRoller(): string {
  return useContext(RollerContext)
}

/**
 * The mode a d20 roll is made with. Shift/Alt force advantage/disadvantage. Otherwise the mode
 * armed in the roll log and the roll's own default (e.g. a class's save advantage) combine as in
 * the 2024 rules: either one alone applies, and advantage plus disadvantage cancel to a plain roll.
 */
export function resolveRollMode({
  shift,
  alt,
  armed,
  base,
}: {
  shift: boolean
  alt: boolean
  armed: RollMode
  base: RollMode
}): RollMode {
  if (shift) return 'advantage'
  if (alt) return 'disadvantage'
  if (armed === 'normal') return base
  if (base === 'normal' || base === armed) return armed
  return 'normal'
}
