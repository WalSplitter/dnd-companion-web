import { wikilinkTarget } from '../wikilinks'
import { findRawFileByName, type RawFile } from '../rawFile'
import type { AbilityKey, CharacterFeature, CharacterFrontmatter, Currency, SkillKey } from '../types'
import { extractItemTable } from './markdownTable'

/**
 * Adapter for the "Character Sheet Vorlage" format used by an existing campaign vault
 * (German field names, no `type:` marker, values expressed as Dataview-style nested objects).
 * Detected structurally (see `looksLikeLegacyCharacter`) rather than by a marker field, since the
 * source vault predates this app and its authors are mid-redesign of their own rules/format.
 *
 * This is deliberately best-effort: fields with no equivalent here (spellcasting, homebrew AC
 * formulas that factor in equipped-armor stats) are approximated or left out rather than chasing
 * full fidelity with a format that's about to change again.
 */

const ABILITY_MAP: Record<string, AbilityKey> = {
  Stärke: 'str',
  Geschicklichkeit: 'dex',
  Konstitution: 'con',
  Intelligenz: 'int',
  Weisheit: 'wis',
  Charisma: 'cha',
}

const SKILL_MAP: Record<string, SkillKey> = {
  Akrobatik: 'acrobatics',
  Arkane_Kunde: 'arcana',
  Athletik: 'athletics',
  Auftreten: 'performance',
  Einschüchtern: 'intimidation',
  Fingerfertigkeit: 'sleight_of_hand',
  Geschichte: 'history',
  Heilkunde: 'medicine',
  Heimlichkeit: 'stealth',
  Mit_Tieren_umgehen: 'animal_handling',
  Motiv_erkennen: 'insight',
  Nachforschungen: 'investigation',
  Naturkunde: 'nature',
  Religion: 'religion',
  Täuschen: 'deception',
  Überlebenskunst: 'survival',
  Überzeugen: 'persuasion',
  Wahrnehmung: 'perception',
}

const CURRENCY_MAP: Record<string, keyof Currency> = { PM: 'pp', GM: 'gp', EM: 'ep', SM: 'sp', KM: 'cp' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const WIKILINK_DISPLAY_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/

/** Alias-aware display text for a wikilink field, e.g. `"[[Zwerge|Zwerg]]"` -> `"Zwerg"`. */
function linkDisplay(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const match = WIKILINK_DISPLAY_RE.exec(raw.trim())
  if (!match) return raw.trim()
  return (match[2] ?? match[1]).trim()
}

/** The target (filename) a wikilink field points at, ignoring any display alias. */
function linkFile(raw: unknown): string {
  return typeof raw === 'string' ? wikilinkTarget(raw) : ''
}

function firstSummaryLine(body: string): string | undefined {
  const line = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('>'))
  if (!line) return undefined
  return line
    .replace(/\*\*?/g, '')
    .replace(WIKILINK_DISPLAY_RE, (_match, target: string, alias: string | undefined) => alias ?? target)
    .trim()
}

export function looksLikeLegacyCharacter(data: Record<string, unknown>): boolean {
  return isRecord(data.Attribute) && isRecord(data.Rettungswürfe) && isRecord(data.Fertigkeiten)
}

function resolveHitDie(className: string, files: RawFile[]): string {
  const classFile = findRawFileByName(files, className)
  const raw = classFile?.data.Trefferwürfel
  if (typeof raw === 'string') {
    const match = /^W(\d+)$/i.exec(raw.trim())
    if (match) return `d${match[1]}`
  }
  return 'd8'
}

function resolveArmorClass(data: Record<string, unknown>, dexMod: number): number {
  const verteidigung = data.Verteidigung
  if (isRecord(verteidigung)) {
    const base = typeof verteidigung.Natürliche_Rüstung === 'number' ? verteidigung.Natürliche_Rüstung : 10
    const extra = typeof verteidigung.Zusätzliche_Rüstung === 'number' ? verteidigung.Zusätzliche_Rüstung : 0
    return base + extra + dexMod
  }
  return 10 + dexMod
}

function collectFeatures(data: Record<string, unknown>, files: RawFile[]): CharacterFeature[] {
  const entries: { link: string; source: string }[] = []

  const merkmale = data.Merkmale
  if (Array.isArray(merkmale)) {
    for (const link of merkmale) if (typeof link === 'string') entries.push({ link, source: 'Merkmal' })
  } else if (isRecord(merkmale)) {
    for (const [source, links] of Object.entries(merkmale)) {
      if (!Array.isArray(links)) continue
      for (const link of links) if (typeof link === 'string') entries.push({ link, source })
    }
  }

  const talente = data.Talente
  if (Array.isArray(talente)) {
    for (const link of talente) if (typeof link === 'string') entries.push({ link, source: 'Talent' })
  }

  return entries.map(({ link, source }) => {
    const file = findRawFileByName(files, linkFile(link))
    return { name: linkDisplay(link), source, description: file ? firstSummaryLine(file.body) : undefined }
  })
}

function findInventoryFile(characterFileName: string, files: RawFile[]): RawFile | undefined {
  const target = characterFileName.trim().toLowerCase()
  return files.find((f) => linkFile(f.data.Charakter).toLowerCase() === target)
}

function resolveCurrency(geld: unknown): Currency | undefined {
  if (!isRecord(geld)) return undefined
  const currency: Currency = {}
  for (const [de, en] of Object.entries(CURRENCY_MAP)) {
    const value = geld[de]
    if (typeof value === 'number') currency[en] = value
  }
  return currency
}

export function normalizeLegacyCharacter(file: RawFile, allFiles: RawFile[]): CharacterFrontmatter {
  const { data } = file

  const abilitiesRaw = isRecord(data.Attribute) ? data.Attribute : {}
  const abilities: Record<AbilityKey, number> = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }
  for (const [de, en] of Object.entries(ABILITY_MAP)) {
    const value = abilitiesRaw[de]
    if (typeof value === 'number') abilities[en] = value
  }

  const level = typeof data.Stufe === 'number' ? data.Stufe : 1
  const proficiencyBonus = Math.ceil(level / 4) + 1
  const dexMod = Math.floor((abilities.dex - 10) / 2)

  const savesRaw = isRecord(data.Rettungswürfe) ? data.Rettungswürfe : {}
  const savingThrowProficiencies = Object.entries(ABILITY_MAP)
    .filter(([de]) => Number(savesRaw[de]) > 0)
    .map(([, en]) => en)

  const skillsRaw = isRecord(data.Fertigkeiten) ? data.Fertigkeiten : {}
  const skillProficiencies: SkillKey[] = []
  const skillExpertise: SkillKey[] = []
  for (const [de, en] of Object.entries(SKILL_MAP)) {
    const value = Number(skillsRaw[de]) || 0
    if (value >= 2) skillExpertise.push(en)
    else if (value >= 1) skillProficiencies.push(en)
  }

  const hintergrund = isRecord(data.Hintergrund) ? data.Hintergrund : {}
  const className = linkFile(hintergrund.Klasse) || 'Unknown'

  const gesundheit = isRecord(data.Gesundheit) ? data.Gesundheit : {}
  const hpMax = typeof gesundheit.MaxTP === 'number' ? gesundheit.MaxTP : 1
  const hpCurrent = typeof gesundheit.TP === 'number' ? gesundheit.TP : hpMax
  const hpTemp = typeof gesundheit.TempTP === 'number' ? gesundheit.TempTP : 0
  const hitDiceUsed = typeof gesundheit.TW === 'number' ? Math.max(0, level - gesundheit.TW) : 0

  const uebung = isRecord(data.Übung) ? data.Übung : {}
  const languages = Array.isArray(uebung.Sprachen) ? uebung.Sprachen.map(linkDisplay).filter(Boolean) : undefined
  const toolProficiencies = Array.isArray(uebung.Werkzeuge) ? uebung.Werkzeuge.map(linkDisplay).filter(Boolean) : undefined

  const inventoryFile = findInventoryFile(file.name, allFiles)
  const equipped = inventoryFile ? extractItemTable(inventoryFile.body, 'Am Körper') : undefined
  const carried = inventoryFile ? extractItemTable(inventoryFile.body, 'Rucksack') : undefined
  const currency = inventoryFile ? resolveCurrency(inventoryFile.data.Geld) : undefined

  return {
    type: 'character',
    name: typeof hintergrund.Name === 'string' ? hintergrund.Name : file.name,
    class: [{ name: linkDisplay(hintergrund.Klasse) || className, level, subclass: linkDisplay(hintergrund.Subklasse) || undefined }],
    species: linkDisplay(hintergrund.Volk) || 'Unknown',
    background: linkDisplay(hintergrund.Herkunft) || 'Unknown',
    alignment: linkDisplay(hintergrund.Gesinnung) || 'Unknown',
    experience: 0,
    abilities,
    proficiency_bonus: proficiencyBonus,
    saving_throw_proficiencies: savingThrowProficiencies,
    skill_proficiencies: skillProficiencies,
    skill_expertise: skillExpertise.length > 0 ? skillExpertise : undefined,
    armor_class: resolveArmorClass(data, dexMod),
    speed: typeof data.Bewegung === 'number' ? `${data.Bewegung} Felder` : 'unknown',
    hp: { current: hpCurrent, max: hpMax, temp: hpTemp },
    hit_dice: { die: resolveHitDie(className, allFiles), total: level, used: hitDiceUsed },
    languages,
    tool_proficiencies: toolProficiencies,
    inventory: equipped || carried ? { equipped, carried } : undefined,
    currency,
    features: collectFeatures(data, allFiles),
  }
}
