/** Lower case without accents — the form searches compare in (`Brücke` matches `brucke`). */
export function fold(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}
