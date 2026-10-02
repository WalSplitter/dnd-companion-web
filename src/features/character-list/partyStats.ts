/** One scale for every chart of a system, so shapes compare across the party: at least −2…+4,
 * widened to whatever the party actually reaches. */
export function radarDomain(values: number[]): [number, number] {
  return [Math.min(-2, ...values), Math.max(4, ...values)]
}

/** From this party size the overlay stops drawing one outline per character (that turns into a
 * tangle) and shows the party's best and average values instead. */
export const AGGREGATE_FROM = 6

/** Per attribute: the best value anyone in the party has, and the party average. */
export function partyAggregate(values: number[][]): { max: number[]; mean: number[] } {
  const axes = values[0]?.length ?? 0
  const column = (i: number) => values.map((v) => v[i])
  return {
    max: Array.from({ length: axes }, (_, i) => Math.max(...column(i))),
    mean: Array.from({ length: axes }, (_, i) => column(i).reduce((sum, v) => sum + v, 0) / values.length),
  }
}

/** Every value tied for the row's best, or none when the whole party is level (nothing to point at). */
export function bestValue(values: (number | undefined)[]): number | undefined {
  const known = values.filter((v): v is number => v !== undefined)
  if (known.length < 2) return undefined
  const best = Math.max(...known)
  return known.every((v) => v === best) ? undefined : best
}
