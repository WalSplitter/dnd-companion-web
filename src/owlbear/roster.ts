import type OBRType from '@owlbear-rodeo/sdk'
import { LIVE_KEY, readRoster, type LiveRoster, type LiveVitals, type Vitals } from './live'

type Obr = typeof OBRType

/** Changes the room's roster. Read right before writing: someone else may have changed another
 * character meanwhile. Resolves to the roster as written. */
export async function writeRoster(obr: Obr, change: (roster: LiveRoster) => LiveRoster): Promise<LiveRoster> {
  const roster = change(readRoster(await obr.room.getMetadata()))
  await obr.room.setMetadata({ [LIVE_KEY]: roster })
  return roster
}

/** `vitals` as a roster entry written by `by` (a connection, or a tracker such as Clash) just now. */
export function stamp(vitals: Vitals, by: string, byName: string): LiveVitals {
  const { hp, hpMax, temp, resilience, resilienceMax, ac, mana, manaMax, exhaustion, exhaustionMax, perception } = vitals
  return {
    hp,
    hpMax,
    temp,
    ...(resilience !== undefined ? { resilience, resilienceMax } : {}),
    ac,
    ...(mana !== undefined ? { mana, manaMax } : {}),
    ...(exhaustion ? { exhaustion, exhaustionMax } : {}),
    ...(perception !== undefined ? { perception } : {}),
    by,
    byName,
    at: Date.now(),
  }
}
