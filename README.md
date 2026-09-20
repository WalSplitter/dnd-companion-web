# D&D Companion

A local-first character sheet viewer that reads character, item, and spell data straight out of an
Obsidian vault — no server, no database, no cloud sync. Your vault stays exactly where it is, in its
own repo; this app only reads it. Built primarily around this app's own D&D 5e (2024)-shaped
frontmatter, it also understands two real campaign vaults with their own, different rules (a legacy
German-language sheet format, and a from-scratch "Endeavour"/Nimble ruleset) — see "Vault formats"
below.

## Getting started

```bash
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. A bundled sample vault (one Wizard character, a few
items and spells) loads automatically so there's something to look at immediately.

To use your own vault, click **Open vault folder…** in the header and pick the vault's root folder.
Chromium-based browsers (Chrome, Edge) use the native File System Access API and remember the folder
across restarts (with a one-click **Reconnect** if the browser drops permission). Other browsers fall
back to a `<input webkitdirectory>` picker, which needs to be re-selected each session.

Other commands:

```bash
npm run build   # type-check + production build
npm run test    # vitest
npm run lint    # oxlint
```

## Vault formats

The app recognizes several character-file shapes; any of them can live in the same vault, and a
best-effort ruleset badge (`src/vault/detectRuleset.ts`) in the header shows which one(s) it detected.

### 1. Native schema (`type: character` / `item` / `spell`)

The app's own frontmatter format — see `src/vault/types.ts` for the full shape. Items and spells are
separate vault files, referenced from a character via Obsidian `[[Wikilink]]`s:

```yaml
---
type: character
name: Elandra Windrider
class: [{ name: Wizard, level: 5, subclass: School of Evocation }]
species: Elf (High Elf)
background: Sage
alignment: Neutral Good
experience: 6500
abilities: { str: 8, dex: 14, con: 13, int: 17, wis: 12, cha: 10 }
proficiency_bonus: 3
saving_throw_proficiencies: [int, wis]
skill_proficiencies: [arcana, history]
skill_expertise: [arcana]
armor_class: 12
speed: 30 ft
hp: { current: 27, max: 38 }
hit_dice: { die: d6, total: 5, used: 1 }
inventory:
  equipped: ["[[Quarterstaff]]"]
  carried: ["[[Spellbook]]"]
currency: { gp: 45 }
spellcasting: { ability: int, slots: { "1": { max: 4, used: 1 } } }
spells_known: ["[[Fire Bolt]]"]
features: [{ name: Arcane Recovery, source: Wizard 1, description: "..." }]
---
```

Derived numbers — ability modifiers, save/skill bonuses, passive perception, spell save DC/attack —
are computed from these raw values (`src/vault/deriveStats.ts`), never duplicated in frontmatter.
`type: item` and `type: spell` files follow the same idea; see the bundled `src/sample-vault/` for
complete examples.

A character's `endeavour_inventory`/`currency`/`spellcasting`/`spells_known` don't have to live on the
character's own file: they're also read from separate notes that link back via
`Charakter: "[[<character file name>]]"` (see `resolveLinkedCharacterExtensions()` in
`parseFrontmatter.ts`), mirroring the legacy adapter's `Inventar <Name>.md`/`Spell Sheet <Name>.md`
convention below. A field set directly on the character's own file always takes priority.

### 2. The "Endeavour" vault: a real, from-scratch Nimble ruleset

One real campaign vault (tagged `Regeln/Nimble` throughout its own rules pages) uses the app's native
`type: character` marker but a genuinely different underlying ruleset, layered on top additively:

- **Items** (`src/vault/adapters/endeavourItem.ts`): detected by tag (`Gegenstand/Waffe|Rüstung|Schild|
  Magischer_Gegenstand|Behälter|Ausrüstung`, bare `Werkzeug`) rather than a `type:` marker, and kept in
  their own `Vault.endeavourItems` collection rather than `Vault.items` — the tag scheme overlaps with
  the legacy adapter's own weapon/armor detection, so folding them together would change that vault's
  behavior too, a decision left for later.
- **Slot-grid inventory** (`character.endeavour_inventory`, `src/features/inventory/components/
  EndeavourInventoryGrid.tsx`): containers (a backpack, belt pouches) each have a `Plaetze` slot
  capacity; items cost 1+ slots and are placed as individual grid tiles, dragged between containers or
  added via search. A gear pickup with no vault page yet can be added as a temporary inline item
  (`{ name, plaetze }`, no wikilink) as a fallback. **Local-only**: container contents aren't written
  back to disk yet (`setEndeavourInventory()` in `vaultStore.ts`), unlike the numeric fields below.
- **Attributes/skills** (`character.nimble_attributes`/`nimble_skills`, see `NIMBLE_ATTRIBUTES`/
  `NIMBLE_SKILL_ATTRIBUTES` in `types.ts`): eight attributes (Stärke/Beweglichkeit/Konstitution/
  Geschick/Instinkt/Verstand/Präsenz/Entschlossenheit, valued -5..+5 and used directly as the roll
  modifier) instead of the six D&D `abilities`, and the 18 skills reassigned to whichever of those
  attributes actually governs them per the vault's own rules (e.g. Medicine moves off WIS). The Ability
  Scores/Skills/Saving Throws cards render this instead of the D&D shape whenever it's present.
  `abilities`/`proficiency_bonus` stay populated as an internal bridge either way — AC, initiative, and
  spellcasting DC math haven't been ported to the real Nimble formulas yet and still read them.

See `01 - Spielerbereich/Kampagne/Gruppe/Dummy/` in that vault for a complete example character (sheet
+ linked inventory/spell-sheet notes, entirely self-contained in its own folder).

### 3. Legacy adapter (an older campaign vault)

A different, older vault predates this app and uses a completely different, German-language schema
with no `type:` marker (nested `Attribute`/`Rettungswürfe`/`Fertigkeiten` objects, Dataview-flavored
formulas, items tracked as markdown tables in a linked `Inventar <Name>.md` file rather than as
frontmatter). The app detects this shape structurally and normalizes it on the fly — see
`src/vault/adapters/legacyCharacterSheet.ts`. Nothing in the source vault is modified.

This adapter is best-effort, not full fidelity, since the schema it targets predates this app and is
expected to change:

- Hit die is resolved by looking up the linked class file's `Trefferwürfel` field; falls back to `d8`.
- Feature descriptions are pulled from the first summary line of the linked feature file's body.
- Armor class uses `Verteidigung.Natürliche_Rüstung + Zusätzliche_Rüstung + DEX modifier` if present,
  else a flat `10 + DEX modifier` — equipped-armor item stats aren't cross-referenced.
- Inventory/currency come from a sibling file whose frontmatter `Charakter` field links back to the
  character (matching the source vault's own convention); items are parsed from its `Am Körper` /
  `Rucksack` markdown tables.
- Spellcasting (spell slots, known spells) is read from either the character file itself or a linked
  spell sheet, whichever actually carries `Zauber`/`Zauberplätze` — see `findSpellSource()`.

### Adding another format

All formats go through the same pipeline: `buildVault()` in `src/vault/parseFrontmatter.ts` parses
every file's raw frontmatter (`src/vault/rawFile.ts`), then tries each known shape in turn. To support
a new vault schema, add a `detect()` + `normalize()` pair under `src/vault/adapters/` that maps the new
shape onto `CharacterFrontmatter` (or its own parallel collection, if merging it into an existing one
would change behavior for a vault the app already supports — see the Endeavour item adapter above for
why), and wire it into `buildVault()` — the rest of the app (derived stats, the sheet UI, inventory,
spells) is entirely format-agnostic. `docs/inventory-vault-alignment.md` has the original analysis this
was based on, from back when the Endeavour vault was just a preliminary, unconfirmed export.

## Browser support

Vault folder access uses the File System Access API, which is Chromium-only (Chrome, Edge, Opera).
Firefox and Safari fall back to a one-shot `<input webkitdirectory>` picker with no persistent handle.

## Not yet implemented

- Native-schema inventory (`inventory.equipped`/`carried` wikilinks) and currency are read-only; only
  the legacy adapter's Meta-Bind fallback fields and the Endeavour attribute/skill/ability numbers
  write back today (see `src/vault/writeback/`).
- The Endeavour slot-grid inventory's container contents (`endeavour_inventory`) are edited locally
  only and never written back to disk.
- Death saves are display-only (no click-to-toggle).
- The Endeavour vault's actual combat math (Ausweichwert/Initiative/Zauber-SG formulas) isn't wired up
  yet — those numbers still come from the D&D-shaped bridge fields (`abilities`, `armor_class`, ...).
- PWA/offline packaging (`vite-plugin-pwa`) isn't wired up yet.
