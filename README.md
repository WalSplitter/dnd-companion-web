# D&D Companion

A local-first character sheet viewer for D&D 5e (2024 rules) that reads character, item, and spell
data straight out of an Obsidian vault — no server, no database, no cloud sync. Your vault stays
exactly where it is, in its own repo; this app only reads it.

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

The app recognizes two character-file shapes; both can live in the same vault.

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

### 2. Legacy adapter (existing campaign vaults)

Some vaults predate this app and use a completely different, German-language schema with no `type:`
marker (nested `Attribute`/`Rettungswürfe`/`Fertigkeiten` objects, Dataview-flavored formulas, items
tracked as markdown tables in a linked `Inventar <Name>.md` file rather than as frontmatter). The app
detects this shape structurally and normalizes it on the fly — see
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
- Spellcasting (spell slots, known spells) isn't extracted yet — the source format keeps those in a
  separate per-character sheet this adapter doesn't parse.

### Adding a third format

Both formats go through the same pipeline: `buildVault()` in `src/vault/parseFrontmatter.ts` parses
every file's raw frontmatter (`src/vault/rawFile.ts`), then tries each known shape in turn. To support
a new vault schema (e.g. once an in-progress vault redesign lands), add a `detect()` + `normalize()`
pair under `src/vault/adapters/` that maps the new shape onto `CharacterFrontmatter`, and wire it into
`buildVault()` alongside the existing legacy adapter — the rest of the app (derived stats, the sheet
UI, inventory, spells) is entirely format-agnostic.

## Browser support

Vault folder access uses the File System Access API, which is Chromium-only (Chrome, Edge, Opera).
Firefox and Safari fall back to a one-shot `<input webkitdirectory>` picker with no persistent handle.

## Not yet implemented

- Editing: the app is read-only. Nothing it does writes back to the vault.
- Death saves are display-only (no click-to-toggle).
- PWA/offline packaging (`vite-plugin-pwa`) isn't wired up yet.
