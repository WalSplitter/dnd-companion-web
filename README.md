# D&D Companion

**A local-first D&D character sheet that lives inside your Obsidian vault.**
Point it at a folder, and your characters, items and spells turn into an interactive sheet — no
server, no database, no account, no cloud sync. Your notes never leave your machine.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![React 19](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)

## Features

- **Reads your vault directly.** Frontmatter and `[[Wikilinks]]` are parsed in the browser; items,
  spells and features resolve through hover/click previews just like in Obsidian.
- **Writes back, safely.** With one click of *Enable editing*, HP, spell slots, ability scores,
  conditions, coin purse and inventory changes are patched into the exact YAML key they came from —
  formatting and comments in your notes are preserved. A failed write is rolled back and shown in an
  error log with a retry button.
- **Three vault formats in one app.** A native schema, a from-scratch "Endeavour"/Nimble ruleset with a
  slot-grid inventory, and an adapter for an older German-language sheet format (see
  [Vault formats](#vault-formats)).
- **Slot-grid inventory.** Drag items between backpacks and belt pouches, search the vault for gear,
  track charges on consumables, or add a temporary item that has no vault page yet.
- **Derived stats, never duplicated.** Modifiers, saves, skills, passive perception and spell DC /
  attack bonus are computed from raw values.
- **Dice roller.** Click any attack, damage or hit-die value (`1d8`, `2d6+3`, `1W6`) to roll it.
- **Spells and resources.** Slot tracker, known-spell list, class resource pools, luck points and
  exhaustion.
- **Themes and languages.** Eight colour themes; English and German UI.
- **Fast and light.** The sheet is code-split and loaded on first visit; the whole app is a static
  bundle.

## Getting started

Requires [Node.js](https://nodejs.org) 20+.

```bash
git clone https://github.com/WalSplitter/dnd-companion-web.git
cd dnd-companion-web
npm install
npm run dev
```

Open the printed `http://localhost:5173` URL. A bundled sample vault (one Wizard, a few items and
spells) loads automatically, so there is something to look at right away.

### Using your own vault

1. Click **Open vault folder…** in the header and pick your vault's root folder.
2. Click **Enable editing** if you want changes written back to your notes (the browser asks for
   permission once).

Your vault is only ever read, and only written when you have enabled editing.

| Browser | Behaviour |
| --- | --- |
| Chrome, Edge, Opera | File System Access API: the folder is remembered across restarts, with a one-click **Reconnect** if the browser drops permission. Editing supported. |
| Firefox, Safari | Falls back to a `<input webkitdirectory>` picker that must be re-selected each session. **Read-only.** |

## Scripts

```bash
npm run dev         # start the dev server
npm run build       # type-check + production build
npm run preview     # serve the production build
npm run test        # vitest (once)
npm run test:watch  # vitest in watch mode
npm run lint        # oxlint
```

## Vault formats

The app recognises several character-file shapes; they can all live in the same vault. A best-effort
ruleset badge in the header (`src/vault/detectRuleset.ts`) shows which one(s) it detected.

### 1. Native schema (`type: character` / `item` / `spell`)

The app's own frontmatter format (full shape in `src/vault/types.ts`). Items and spells are separate
notes, referenced from a character via `[[Wikilinks]]`:

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

Derived numbers are computed from these raw values (`src/vault/deriveStats.ts`). See
[`src/sample-vault/`](src/sample-vault) for complete examples of characters, items and spells.

`endeavour_inventory`, `currency`, `spellcasting` and `spells_known` don't have to live on the
character's own file: they are also read from separate notes that link back via
`Charakter: "[[<character file name>]]"` (see `resolveLinkedCharacterExtensions()` in
`parseFrontmatter.ts`). A field set directly on the character's file always takes priority.

### 2. "Endeavour": a from-scratch Nimble ruleset

Uses the native `type: character` marker but a genuinely different underlying ruleset, layered on
additively:

- **Items** ([`endeavourItem.ts`](src/vault/adapters/endeavourItem.ts)) are detected by tag
  (`Gegenstand/Waffe|Rüstung|Schild|Magischer_Gegenstand|Behälter|Ausrüstung`, bare `Werkzeug`) and kept
  in their own `Vault.endeavourItems` collection, because the tag scheme overlaps with the legacy
  adapter's weapon/armour detection.
- **Slot-grid inventory** (`character.endeavour_inventory`,
  [`EndeavourInventoryGrid.tsx`](src/features/inventory/components/EndeavourInventoryGrid.tsx)):
  containers have a `Plaetze` capacity; items cost one or more slots and are placed as tiles.
  Container contents are written back to the owning file.
- **Attributes and skills** (`nimble_attributes` / `nimble_skills`): eight attributes valued −5…+5 and
  used directly as the roll modifier, with the 18 skills reassigned to the attribute that governs them.
  The Ability Scores / Skills / Saving Throws cards render this shape whenever it is present.
  `abilities` / `proficiency_bonus` stay populated as an internal bridge for AC, initiative and spell
  DC math, which is not yet ported to the real Nimble formulas.
- **Armor and evasion**: `armor: "[[Kettenhemd]]"` (or `Rüstung:`) links the worn armor note; its
  "Max BW" (`BW_cap` on the note) caps the BW part of the evasion value (`10 + BW`). The cap is never read from the
  character file itself.
- **TP / RP without hit dice**: Nimble characters have no hit dice (a `hit_dice` block is ignored).
  Max TP/RP are `level × (class + subclass + attribute bonus)`, with `TP_pro_Stufe` / `RP_pro_Stufe`
  read from notes named like the class and subclass, and KO (TP) / half EN rounded down (RP) as the
  attribute bonus. Without a class note declaring them, the sheet's own `hp.max` / `resilience.max`
  are used.

### 3. Legacy adapter (older German-language vault)

An older vault predating this app uses a different schema with no `type:` marker (nested
`Attribute` / `Rettungswürfe` / `Fertigkeiten` objects, Dataview-flavoured formulas, items in markdown
tables inside a linked `Inventar <Name>.md`). The app detects it structurally and normalises it on the
fly ([`legacyCharacterSheet.ts`](src/vault/adapters/legacyCharacterSheet.ts)); nothing in the source
vault is modified except through explicit edits.

This adapter is best-effort, not full fidelity:

- Hit die comes from the linked class file's `Trefferwürfel`, falling back to `d8`.
- Feature descriptions use the first summary line of the linked feature note.
- Armor class is `Natürliche_Rüstung + Zusätzliche_Rüstung + DEX modifier` when present, otherwise
  `10 + DEX modifier`; equipped-armour item stats are not cross-referenced.
- Inventory and currency come from a sibling file whose `Charakter` field links back to the character.
- Spellcasting is read from the character file or a linked spell sheet, whichever carries
  `Zauber` / `Zauberplätze`.

## Architecture

```
src/
├── vault/        parsing pipeline: raw frontmatter -> adapters -> normalised Vault, wikilink index,
│   │              derived stats, ruleset detection
│   ├── adapters/  one detect()/normalize() pair per supported format
│   └── writeback/ surgical YAML patching, so edits keep the note's formatting
├── store/        zustand stores: vault (load, optimistic edits + rollback) and error log
├── features/     character-sheet, inventory (slot grid), spells
├── components/   shared UI building blocks
├── dice/         dice notation parser and roll button
├── i18n/         English / German dictionaries
├── theme/        theme tokens and switcher
└── routes/       character list and character sheet pages
```

Every format goes through the same pipeline: `buildVault()` in `src/vault/parseFrontmatter.ts`
parses each file's frontmatter, then tries each known shape in turn. The rest of the app (derived
stats, sheet UI, inventory, spells) is format-agnostic.

**Adding another format:** add a `detect()` + `normalize()` pair under `src/vault/adapters/` that maps
the new shape onto `CharacterFrontmatter` (or its own parallel collection if merging would change
behaviour for an already supported vault) and wire it into `buildVault()`. The original analysis
behind the Endeavour support lives in
[`docs/inventory-vault-alignment.md`](docs/inventory-vault-alignment.md).

**Tech stack:** React 19, TypeScript, Vite, Tailwind CSS 4, React Router, zustand, js-yaml, Vitest,
oxlint.

## Roadmap

- Native-schema inventory lists (`inventory.equipped` / `carried` wikilinks) only write back quantity
  and weight of inline items; adding and removing entries is not yet supported.
- Death saves are display-only (no click-to-toggle).
- The Endeavour combat math (Ausweichwert, Initiative, Zauber-SG) isn't wired up yet; those numbers
  still come from the D&D-shaped bridge fields.
- PWA / offline packaging (`vite-plugin-pwa`).

## License

[MIT](LICENSE)
