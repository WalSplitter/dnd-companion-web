/** URL of a character's sheet (`/characters/:characterName` in `App`). */
export function characterRoute(name: string): string {
  return `/characters/${encodeURIComponent(name)}`
}
