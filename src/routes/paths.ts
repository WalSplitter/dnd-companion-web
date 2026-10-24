import { matchPath } from 'react-router-dom'

/** The party page. */
export const PARTY_ROUTE = '/characters'
/** A character's sheet, as `App` routes it. */
export const CHARACTER_ROUTE = '/characters/:characterName'

/** The character a sheet URL shows, decoded; undefined on any other page. */
export function characterNameFromPath(pathname: string): string | undefined {
  const raw = matchPath(CHARACTER_ROUTE, pathname)?.params.characterName
  if (raw === undefined) return undefined
  try {
    return decodeURIComponent(raw)
  } catch {
    return raw
  }
}

/** URL of a character's sheet (`CHARACTER_ROUTE`). */
export function characterRoute(name: string): string {
  return `${PARTY_ROUTE}/${encodeURIComponent(name)}`
}
