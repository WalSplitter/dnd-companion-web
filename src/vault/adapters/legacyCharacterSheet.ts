import { wikilinkTarget } from '../wikilinks'
import { findRawFileByName, type RawFile } from '../rawFile'
import type {
  AbilityKey,
  CharacterFeature,
  CharacterFrontmatter,
  Currency,
  SkillKey,
  SpellcastingInfo,
  SpellSlotInfo,
} from '../types'
import { extractItemTable } from './markdownTable'
import { resolveWikilinksInText } from '../textClean'
import type { ImageAssets } from '../vaultLoader'

/**
 * Adapter for the "Character Sheet Vorlage" format used by an existing campaign vault
 * (German field names, no `type:` marker, values expressed as Dataview-style nested objects).
 * Detected structurally (see `looksLikeLegacyCharacter`) rather than by a marker field, since the
 * source vault predates this app and its authors are mid-redesign of their own rules/format.
 *
 * This is deliberately best-effort: fields with no equivalent here (homebrew AC formulas that
 * factor in equipped-armor stats, warlock invocations) are approximated or left out rather than
 * chasing full fidelity with a format that's about to change again.
 */

export const ABILITY_MAP: Record<string, AbilityKey> = {
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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const WIKILINK_DISPLAY_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/

/** Alias-aware display text for a wikilink field, e.g. `"[[Zwerge|Zwerg]]"` -> `"Zwerg"`. */
export function linkDisplay(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const match = WIKILINK_DISPLAY_RE.exec(raw.trim())
  if (!match) return raw.trim()
  return (match[2] ?? match[1]).trim()
}

/** The target (filename) a wikilink field points at, ignoring any display alias. */
export function linkFile(raw: unknown): string {
  return typeof raw === 'string' ? wikilinkTarget(raw) : ''
}

function firstSummaryLine(body: string): string | undefined {
  const line = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('```'))
  if (!line) return undefined
  return resolveWikilinksInText(line.replace(/\*\*?/g, '')).trim()
}

/**
 * The vault's monster/creature stat blocks (Bestiarium) reuse the exact same
 * Attribute/Rettungswürfe/Fertigkeiten shape as player characters, so those alone aren't enough to
 * tell them apart. Only PC sheets carry a `Hintergrund` block (name/species/class/background) —
 * creatures use `Typ`/`Herausforderungsgrad`/`Angriff` instead.
 */
export function looksLikeLegacyCharacter(data: Record<string, unknown>): boolean {
  return isRecord(data.Attribute) && isRecord(data.Rettungswürfe) && isRecord(data.Fertigkeiten) && isRecord(data.Hintergrund)
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

/**
 * Finds the character's linked "<Prefix> <Name>.md" sheet (inventory, ...): a separate file
 * back-linked via a `Charakter: "[[Name]]"` field. Filtering by filename prefix (not just the
 * backlink) matters because a character can have several such linked sheets.
 */
function findLinkedSheet(characterFileName: string, files: RawFile[], namePrefix: string): RawFile | undefined {
  const target = characterFileName.trim().toLowerCase()
  const prefix = namePrefix.toLowerCase()
  return files.find((f) => f.name.toLowerCase().startsWith(prefix) && linkFile(f.data.Charakter).toLowerCase() === target)
}

/**
 * Unlike the inventory file (always a separate "Inventar <Name>.md"), known spells and slot usage
 * have been stored differently across this vault's history: some characters have a separate spell
 * sheet file (any name, back-linked via `Charakter`) carrying `Zauber`/`Zauberplätze`; others have
 * those same fields directly on the character file itself. Detected by content, not filename.
 */
function findSpellSource(characterFileName: string, files: RawFile[]): RawFile | undefined {
  const target = characterFileName.trim().toLowerCase()
  return files.find(
    (f) =>
      linkFile(f.data.Charakter).toLowerCase() === target &&
      (Array.isArray(f.data.Zauber) || isRecord(f.data.Zauberplätze)),
  )
}

function firstRecord(...candidates: unknown[]): Record<string, unknown> {
  for (const candidate of candidates) if (isRecord(candidate)) return candidate
  return {}
}

/**
 * Known spells: `Zauber` holds the freely-known spell list, `Pakt_des_Buches` is a warlock-specific
 * always-prepared list also worth surfacing. Both may live on the character file itself or on a
 * linked spell sheet (see `findSpellSource`) — collected from wherever they're actually set. Both
 * are arrays of `"[[Spell Name]]"` wikilinks, kept as-is for `resolveSpellLink` to resolve.
 */
function resolveSpellsKnown(characterData: Record<string, unknown>, spellSheet: RawFile | undefined): string[] | undefined {
  const known: string[] = []
  for (const source of [characterData, spellSheet?.data]) {
    if (!source) continue
    for (const key of ['Zauber', 'Pakt_des_Buches']) {
      const list = source[key]
      if (Array.isArray(list)) known.push(...list.filter((v): v is string => typeof v === 'string'))
    }
  }
  return known.length > 0 ? known : undefined
}

/**
 * Spell slots aren't stored on the character: the class file's `Zauberplätze.Stufe{level}` table
 * holds the max per grade for that level. The *current remaining* count per grade (an Obsidian
 * INPUT bound to a manual counter, not `used`) has moved around over the vault's history — as
 * `Zauberplätze.Grad_{n}` directly, sometimes nested under `InputData`, and on either the character
 * file itself or a linked spell sheet — so every location is checked, in that order.
 */
function resolveSpellcasting(
  className: string,
  level: number,
  characterData: Record<string, unknown>,
  spellSheet: RawFile | undefined,
  files: RawFile[],
): SpellcastingInfo | undefined {
  const classFile = findRawFileByName(files, className)
  const ability = ABILITY_MAP[linkFile(classFile?.data.Zauberattribut)]
  if (!ability) return undefined

  const classSlots = isRecord(classFile?.data.Zauberplätze) ? classFile.data.Zauberplätze[`Stufe${level}`] : undefined

  const characterInputData = isRecord(characterData.InputData) ? characterData.InputData : undefined
  const spellSheetInputData = isRecord(spellSheet?.data.InputData) ? spellSheet.data.InputData : undefined
  const current = firstRecord(
    characterInputData?.Zauberplätze,
    characterData.Zauberplätze,
    spellSheet?.data.Zauberplätze,
    spellSheetInputData?.Zauberplätze,
  )

  const slots: Record<string, SpellSlotInfo> = {}
  if (isRecord(classSlots)) {
    for (let grade = 1; grade <= 9; grade++) {
      const max = classSlots[`Grad${grade}`]
      if (typeof max !== 'number' || max <= 0) continue
      const remaining = current[`Grad_${grade}`]
      const used = typeof remaining === 'number' ? Math.max(0, max - remaining) : 0
      slots[String(grade)] = { max, used }
    }
  }

  return { ability, slots: Object.keys(slots).length > 0 ? slots : undefined }
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

/** Resolves a `Bild: "[[Name.jpg]]"` attachment reference against the loaded image assets. */
function resolvePortrait(hintergrund: Record<string, unknown>, imageAssets: ImageAssets | undefined): string | undefined {
  if (!imageAssets) return undefined
  const target = linkFile(hintergrund.Bild)
  if (!target) return undefined
  return imageAssets.get(target.toLowerCase())
}

export function normalizeLegacyCharacter(
  file: RawFile,
  allFiles: RawFile[],
  imageAssets?: ImageAssets,
): CharacterFrontmatter {
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

  const inventoryFile = findLinkedSheet(file.name, allFiles, 'inventar')
  const inventarSections = isRecord(inventoryFile?.data.Inventar) ? inventoryFile.data.Inventar : undefined
  const equipped = inventoryFile
    ? extractItemTable(inventoryFile.body, 'Am Körper', isRecord(inventarSections?.Körper) ? inventarSections.Körper : undefined)
    : undefined
  const carried = inventoryFile
    ? extractItemTable(inventoryFile.body, 'Rucksack', isRecord(inventarSections?.Rucksack) ? inventarSections.Rucksack : undefined)
    : undefined
  const currency = inventoryFile ? resolveCurrency(inventoryFile.data.Geld) : undefined

  const spellSheetFile = findSpellSource(file.name, allFiles)
  const spellcasting = resolveSpellcasting(className, level, data, spellSheetFile, allFiles)
  const spellsKnown = resolveSpellsKnown(data, spellSheetFile)

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
    spellcasting,
    spells_known: spellsKnown,
    features: collectFeatures(data, allFiles),
    portrait_url: resolvePortrait(hintergrund, imageAssets),
  }
}
