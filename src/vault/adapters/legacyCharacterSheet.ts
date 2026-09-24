import { basename, wikilinkTarget } from '../wikilinks'
import { findRawFileByName, type RawFile } from '../rawFile'
import type {
  AbilityKey,
  CharacterFeature,
  CharacterFrontmatter,
  CharacterWriteTargets,
  ConditionsInfo,
  Currency,
  FieldWriteTarget,
  ResourcePool,
  SkillKey,
  SpellcastingInfo,
  SpellSlotInfo,
  WeaponAttack,
  WeaponKind,
} from '../types'
import { abilityModifier } from '../deriveStats'
import { extractItemTable } from './markdownTable'
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

const CURRENCY_MAP: Record<string, keyof Currency> = { GM: 'gp', SM: 'sp', KM: 'cp' }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const WIKILINK_DISPLAY_RE = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/

/** Alias-aware display text for a wikilink field, e.g. `"[[Zwerge|Zwerg]]"` -> `"Zwerg"`. Falls
 * back to the target's bare filename (not a full path) when there's no alias, same as
 * `wikilinkTarget` — see its comment on why full vault-relative paths show up here at all. */
export function linkDisplay(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  const match = WIKILINK_DISPLAY_RE.exec(raw.trim())
  if (!match) return raw.trim()
  return match[2] ? match[2].trim() : basename(match[1])
}

/** The target (filename) a wikilink field points at, ignoring any display alias. */
export function linkFile(raw: unknown): string {
  return typeof raw === 'string' ? wikilinkTarget(raw) : ''
}

/**
 * Kept as raw markdown (wikilinks intact, only bold markers stripped) rather than resolved to
 * plain text — the UI renders feature descriptions through `renderObsidianLine` (`renderObsidian.tsx`),
 * which turns `[[...]]` into clickable links, so flattening them here would lose that.
 */
function firstSummaryLine(body: string): string | undefined {
  const line = body
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0 && !l.startsWith('#') && !l.startsWith('>') && !l.startsWith('```'))
  if (!line) return undefined
  return line.replace(/\*\*?/g, '').trim()
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
  const seen = new Set<string>()
  for (const source of [characterData, spellSheet?.data]) {
    if (!source) continue
    for (const key of ['Zauber', 'Pakt_des_Buches']) {
      const list = source[key]
      if (!Array.isArray(list)) continue
      for (const link of list) {
        if (typeof link !== 'string') continue
        // Some characters (mid-migration in this vault's history, it seems) carry the same spell
        // list both inline on their own file *and* on a separate linked spell sheet — dedupe by
        // normalized link target rather than trusting only one source, so neither convention
        // silently drops spells for characters who consistently use just one of them.
        const normalized = wikilinkTarget(link).toLowerCase()
        if (seen.has(normalized)) continue
        seen.add(normalized)
        known.push(link)
      }
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

/**
 * Mirrors `resolveSpellcasting`'s exact same candidate lookup order, but instead of the *value* it
 * records exactly which file + key path that value actually came from, so an edit in the app writes
 * back to the same place it was read from rather than guessing. Returns `undefined` for a grade
 * whose remaining-count field doesn't exist on disk at all (nothing to write back to yet).
 */
function resolveSpellSlotWriteTargets(
  characterPath: string,
  characterData: Record<string, unknown>,
  spellSheet: RawFile | undefined,
  slots: Record<string, SpellSlotInfo> | undefined,
): Record<string, FieldWriteTarget> | undefined {
  if (!slots || Object.keys(slots).length === 0) return undefined

  const characterInputData = isRecord(characterData.InputData) ? characterData.InputData : undefined
  const spellSheetInputData = isRecord(spellSheet?.data.InputData) ? spellSheet.data.InputData : undefined

  const candidates: { record: unknown; path: string; prefix: string[] }[] = [
    { record: characterInputData?.Zauberplätze, path: characterPath, prefix: ['InputData', 'Zauberplätze'] },
    { record: characterData.Zauberplätze, path: characterPath, prefix: ['Zauberplätze'] },
    { record: spellSheet?.data.Zauberplätze, path: spellSheet?.path ?? '', prefix: ['Zauberplätze'] },
    { record: spellSheetInputData?.Zauberplätze, path: spellSheet?.path ?? '', prefix: ['InputData', 'Zauberplätze'] },
  ]
  const chosen = candidates.find((c) => isRecord(c.record))
  if (!chosen) return undefined

  const targets: Record<string, FieldWriteTarget> = {}
  for (const [grade, info] of Object.entries(slots)) {
    targets[grade] = { path: chosen.path, keyPath: [...chosen.prefix, `Grad_${grade}`], encode: 'invert-from-max', max: info.max }
  }
  return targets
}

/** One write target per key of `map`, all on the character's own file under `section` — no
 * ambiguity, unlike spell slots/resource pools which can live on a linked sheet. Used for ability
 * scores (`Attribute`), and — legacy schema only, see `CharacterWriteTargets.saving_throw_proficiencies`
 * and `.skills` for why — saving throws (`Rettungswürfe`) and skills (`Fertigkeiten`). */
function sectionWriteTargets<K extends string>(characterPath: string, section: string, map: Record<string, K>): Record<K, FieldWriteTarget> {
  const targets = {} as Record<K, FieldWriteTarget>
  for (const [de, en] of Object.entries(map)) targets[en] = { path: characterPath, keyPath: [section, de] }
  return targets
}

function currencyWriteTargets(path: string, geld: unknown): CharacterWriteTargets['currency'] {
  if (!isRecord(geld)) return undefined
  const targets: NonNullable<CharacterWriteTargets['currency']> = {}
  for (const [de, en] of Object.entries(CURRENCY_MAP)) {
    if (typeof geld[de] === 'number') targets[en] = { path, keyPath: ['Geld', de] }
  }
  return Object.keys(targets).length > 0 ? targets : undefined
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

/** Resolves a `"[[Name.jpg]]"` attachment reference (e.g. a `Bild`/`portrait` field) against the
 * loaded image assets, keyed by bare filename regardless of which vault folder it lives in. */
export function resolvePortraitLink(link: unknown, imageAssets: ImageAssets | undefined): string | undefined {
  if (!imageAssets) return undefined
  const target = linkFile(link)
  if (!target) return undefined
  return imageAssets.get(target.toLowerCase())
}

/** Resolves a `Bild: "[[Name.jpg]]"` attachment reference against the loaded image assets. */
function resolvePortrait(hintergrund: Record<string, unknown>, imageAssets: ImageAssets | undefined): string | undefined {
  return resolvePortraitLink(hintergrund.Bild, imageAssets)
}

const LUCK_POINT_KEYS = ['GlücksPunkt1', 'GlücksPunkt2', 'GlücksPunkt3', 'GlücksPunkt4', 'GlücksPunkt5']

/**
 * Luck points (`InputData.GlücksPunkt1..5`) are pips the character currently *holds* (see the
 * vault's `Glück` rule note — gained on a failed roll, spent to boost a d20), not a spent/used
 * count. Exhaustion (`InputData.ErschöpfungsPunkte`) is a 0-9 counter kept in sync with 9 boolean
 * `Erschöpfung1..9` flags by an in-vault script — the counter is authoritative, no need to recount
 * the flags. `sonstigeZustaende` is a free-text field for anything not otherwise tracked.
 */
function resolveConditions(data: Record<string, unknown>): ConditionsInfo | undefined {
  const inputData = isRecord(data.InputData) ? data.InputData : undefined
  const hasLuck = inputData ? LUCK_POINT_KEYS.some((key) => key in inputData) : false
  const exhaustion = typeof inputData?.ErschöpfungsPunkte === 'number' ? inputData.ErschöpfungsPunkte : undefined
  const notes = typeof data.sonstigeZustaende === 'string' && data.sonstigeZustaende.trim() ? data.sonstigeZustaende.trim() : undefined

  if (!hasLuck && exhaustion === undefined && !notes) return undefined

  const held = hasLuck ? LUCK_POINT_KEYS.map((key) => inputData?.[key] === true) : undefined

  return {
    luck_points: held ? { max: LUCK_POINT_KEYS.length, current: held.filter(Boolean).length, held } : undefined,
    exhaustion,
    exhaustion_max: exhaustion !== undefined ? 9 : undefined,
    notes,
  }
}

/** Write targets for the pieces of `resolveConditions` that came from a fixed, unambiguous location
 * on the character's own file — one per luck pip plus the exhaustion counter. */
function resolveConditionWriteTargets(
  characterPath: string,
  conditions: ConditionsInfo | undefined,
): Pick<CharacterWriteTargets, 'luck_points' | 'exhaustion'> | undefined {
  if (!conditions) return undefined

  const luck_points = conditions.luck_points
    ? LUCK_POINT_KEYS.map((key): FieldWriteTarget => ({ path: characterPath, keyPath: ['InputData', key] }))
    : undefined
  const exhaustion: FieldWriteTarget | undefined =
    conditions.exhaustion !== undefined ? { path: characterPath, keyPath: ['InputData', 'ErschöpfungsPunkte'] } : undefined

  return luck_points || exhaustion ? { luck_points, exhaustion } : undefined
}

/**
 * Generalizes the spell-slot lookup pattern (`resolveSpellcasting` below) to any per-class resource
 * pool: a current value on `InputData` and a max looked up from the class file's own
 * `{SameKey}.Stufe{level}` table (e.g. a Sorcerer's `Zaubereipunkte`/sorcery points). Matching by
 * "same key exists as a per-level table on the class file" — rather than a hardcoded list of class
 * resource names — means a new resource the vault's authors add later (they're mid-redesign of
 * their own rules) is picked up without a code change, as long as it follows this same convention.
 * Per-feature charge counters (e.g. `BlitzOdem`, `DruckwelleLadungen`) don't have a matching class-file
 * table and are correctly left out.
 */
function resolveResourcePools(className: string, level: number, data: Record<string, unknown>, files: RawFile[]): ResourcePool[] | undefined {
  const inputData = isRecord(data.InputData) ? data.InputData : undefined
  if (!inputData) return undefined
  const classFile = findRawFileByName(files, className)
  if (!classFile) return undefined

  const pools: ResourcePool[] = []
  for (const [key, current] of Object.entries(inputData)) {
    if (typeof current !== 'number') continue
    const table = classFile.data[key]
    if (!isRecord(table)) continue
    const max = table[`Stufe${level}`]
    if (typeof max !== 'number') continue
    pools.push({ name: key, current, max })
  }
  return pools.length > 0 ? pools : undefined
}

function hasWeaponTag(tags: unknown, needle: string): boolean {
  return Array.isArray(tags) && tags.some((t) => typeof t === 'string' && t.includes(needle))
}

/** `Eigenschaften`/`EigenschaftenFern` entries are wikilinks, sometimes with trailing notes, e.g.
 * `"[[Vielseitig]] (\`dice: 1d10|none|noform\`)"` — only the link target is checked here. */
function hasWeaponProperty(properties: unknown, name: string): boolean {
  if (!Array.isArray(properties)) return false
  const target = name.toLowerCase()
  return properties.some((p) => typeof p === 'string' && linkFile(p.match(/\[\[[^\]]+\]\]/)?.[0] ?? p).toLowerCase() === target)
}

function weaponPropertyLabels(properties: unknown): string[] | undefined {
  if (!Array.isArray(properties)) return undefined
  const labels = properties.filter((p): p is string => typeof p === 'string').map((p) => linkDisplay(p.match(/\[\[[^\]]+\]\]/)?.[0] ?? p))
  return labels.length > 0 ? labels : undefined
}

/**
 * A character's `Waffen` field lists equipped weapons as wikilinks; each weapon file carries its
 * own combat stats (melee: `Reichweite`/`Schaden`/`Schadensart`/`Eigenschaften`, ranged/thrown:
 * `Range1-3`/`SchadenFern`/`SchadensartFern`/`EigenschaftenFern`), tagged
 * `Gegenstand/Waffe/Klasse/Nahkampfwaffe|Fernkampfwaffe/Schusswaffe|Wurfwaffe`. Bonus math mirrors
 * the vault's own template exactly (`Character Sheet Vorlage.md`'s "Angriff" dataview queries):
 * finesse picks DEX over STR for melee/thrown, ranged is always DEX, and proficiency always applies
 * (per that template's own disclaimer: "Waffen haben immer Übungsbonus").
 */
function resolveWeaponAttacks(
  weaponLinks: unknown,
  files: RawFile[],
  abilities: Record<AbilityKey, number>,
  proficiencyBonus: number,
): WeaponAttack[] | undefined {
  if (!Array.isArray(weaponLinks)) return undefined
  const attacks: WeaponAttack[] = []

  for (const link of weaponLinks) {
    if (typeof link !== 'string') continue
    const file = findRawFileByName(files, linkFile(link))
    if (!file) continue
    const { data } = file

    const melee = hasWeaponTag(data.tags, 'Waffe/Klasse/Nahkampfwaffe')
    const thrown = hasWeaponTag(data.tags, 'Wurfwaffe')
    const ranged = !melee && !thrown && hasWeaponTag(data.tags, 'Fernkampfwaffe')
    if (!melee && !thrown && !ranged) continue
    const kind: WeaponKind = melee ? 'melee' : thrown ? 'thrown' : 'ranged'

    const damageDice = kind === 'melee' ? data.Schaden : data.SchadenFern
    if (typeof damageDice !== 'string' || !damageDice.trim()) continue

    const finesse = hasWeaponProperty(data.Eigenschaften, 'finesse') || hasWeaponProperty(data.EigenschaftenFern, 'finesse')
    const ability: AbilityKey = kind === 'ranged' ? 'dex' : finesse ? 'dex' : 'str'
    const abilityMod = abilityModifier(abilities[ability])

    const range =
      kind === 'melee'
        ? typeof data.Reichweite === 'string'
          ? data.Reichweite
          : ''
        : [data.Range1, data.Range2, data.Range3]
            .filter((v) => v !== undefined && v !== null && v !== '')
            .map(String)
            .join('/')

    attacks.push({
      name: linkDisplay(link) || file.name,
      kind,
      attack_bonus: abilityMod + proficiencyBonus,
      damage_dice: damageDice,
      damage_bonus: abilityMod,
      damage_type: linkDisplay(kind === 'melee' ? data.Schadensart : data.SchadensartFern) || undefined,
      range,
      properties: weaponPropertyLabels(kind === 'melee' ? data.Eigenschaften : data.EigenschaftenFern),
    })
  }

  return attacks.length > 0 ? attacks : undefined
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
  const dexMod = abilityModifier(abilities.dex)

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
    ? extractItemTable(
        inventoryFile.body,
        'Am Körper',
        isRecord(inventarSections?.Körper) ? inventarSections.Körper : undefined,
        { path: inventoryFile.path, keyPath: ['Inventar', 'Körper'] },
      )
    : undefined
  const carried = inventoryFile
    ? extractItemTable(
        inventoryFile.body,
        'Rucksack',
        isRecord(inventarSections?.Rucksack) ? inventarSections.Rucksack : undefined,
        { path: inventoryFile.path, keyPath: ['Inventar', 'Rucksack'] },
      )
    : undefined
  const currency = inventoryFile ? resolveCurrency(inventoryFile.data.Geld) : undefined

  const spellSheetFile = findSpellSource(file.name, allFiles)
  const spellcasting = resolveSpellcasting(className, level, data, spellSheetFile, allFiles)
  const spellsKnown = resolveSpellsKnown(data, spellSheetFile)
  const conditions = resolveConditions(data)
  const resourcePools = resolveResourcePools(className, level, data, allFiles)
  const attacks = resolveWeaponAttacks(data.Waffen, allFiles, abilities, proficiencyBonus)

  const conditionTargets = resolveConditionWriteTargets(file.path, conditions)
  const spellSlotTargets = resolveSpellSlotWriteTargets(file.path, data, spellSheetFile, spellcasting?.slots)
  const writeTargets: CharacterWriteTargets = {
    ...(isRecord(data.Gesundheit)
      ? { hp_current: { path: file.path, keyPath: ['Gesundheit', 'TP'] }, hp_temp: { path: file.path, keyPath: ['Gesundheit', 'TempTP'] } }
      : {}),
    ...(typeof gesundheit.TW === 'number' ? { hit_dice_remaining: { path: file.path, keyPath: ['Gesundheit', 'TW'] } } : {}),
    ...conditionTargets,
    ...(spellSlotTargets ? { spell_slots: spellSlotTargets } : {}),
    abilities: sectionWriteTargets(file.path, 'Attribute', ABILITY_MAP),
    saving_throw_proficiencies: sectionWriteTargets(file.path, 'Rettungswürfe', ABILITY_MAP),
    skills: sectionWriteTargets(file.path, 'Fertigkeiten', SKILL_MAP),
    ...(inventoryFile ? { currency: currencyWriteTargets(inventoryFile.path, inventoryFile.data.Geld) } : {}),
  }

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
    conditions,
    resource_pools: resourcePools,
    attacks,
    _write: Object.keys(writeTargets).length > 0 ? writeTargets : undefined,
  }
}
