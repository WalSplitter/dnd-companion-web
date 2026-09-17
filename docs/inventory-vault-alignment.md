# Inventory/item concept vs. the new "Endeavour" vault (draft alignment)

Status: **draft analysis**. Written after reviewing a preliminary export of the new campaign vault
at `E:\Git\Endeavour_PlayerVault`. The DM has explicitly said this vault is far from final and will
be re-evaluated later — nothing here should be treated as a locked spec. Purpose of this doc: capture
what's actually confirmed vs. inferred vs. missing, so the next pass (once the vault stabilizes) has
a starting point instead of re-deriving everything from scratch.

**Correction (per the DM):** any file or folder whose name starts with `_` (e.g.
`zHidden\_Embeds\...`) is the DM's own private scratch/notes, not part of the vault's real structure.
The entire item-field schema in §2 below was sourced from `zHidden\_Embeds\embed Gegenstand\*` — so
by this rule it's **not even a draft of the real structure**, just the DM's personal working notes
while designing it. Treat §2 as illustrative of the kind of fields likely to appear, not as a source
to build against. Also confirmed: the ruleset itself is a deliberate mixture of D&D, Nimble, and the
DM's own homebrew ideas, and is still being actively worked out — not a fixed target to converge on
yet, and not simply "D&D" or "Nimble" alone.

## 1. What the app currently supports (`src/vault/`)

Two independent schemas feed `Vault.items` / `character.inventory` (see `README.md` "Vault formats"):

- **Native schema** (`src/vault/types.ts` `ItemFrontmatter`, `src/sample-vault/Items/*.md`): one
  markdown file per item, `type: item` frontmatter marker, flat fields
  (`category`, `weight_lb`, `quantity`, `value: Currency`, `properties[]`). Character references items
  by `[[Wikilink]]` in `inventory.equipped` / `inventory.carried`. Rendered **read-only**
  (`src/features/inventory/components/ItemList.tsx`'s `ItemRow`) — no `_write` support exists for
  native-schema inventory at all (`ownSchemaWriteTargets()` in `parseFrontmatter.ts` never touches it).
- **Legacy adapter** (`src/vault/adapters/legacyCharacterSheet.ts` + `markdownTable.ts`): German,
  no `type:` marker, items live as **markdown tables** ("Am Körper" / "Rucksack" headings) inside a
  separate `Inventar <Name>.md` file linked via `Charakter: "[[Name]]"`. Only `name`/`quantity`/`weight_lb`
  survive, as `InlineItem`. Editable **only** when a cell resolves through the Meta-Bind
  `count{n}`/`gewicht{n}` frontmatter fallback (`InlineItemRow` in `ItemList.tsx`) — a literal number
  typed into the table cell stays read-only.
- Item notes with per-category fields (weapon/armor/...) in the legacy vault are **deliberately not**
  promoted to `vault.items` — see the comment on `buildVault()` in `parseFrontmatter.ts`: "schema
  varies too much per category... for a single structural adapter to be worthwhile yet". They currently
  fall through to `vault.notes`.
- Important: the legacy adapter's `resolveWeaponAttacks()` **already reads exactly the tag/field
  scheme the new vault uses** — `Gegenstand/Waffe/Klasse/Nahkampfwaffe|Fernkampfwaffe/Schusswaffe|Wurfwaffe`
  tags, `Reichweite`/`Schaden`/`Schadensart`/`Eigenschaften` fields. So the new vault isn't a clean
  break — it's continuous with (a later revision of) the same tagging convention the current legacy
  vault already partially uses. This matters for §4.

## 2. What the new vault actually contains today

`01 - Spielerbereich\Regeln\Inventar` has **4 files, no item notes**:

- `Inventar.md` — two container types: `Gepäck` (backpack) and `Schnellzugriff` (quick-access).
- `Gepäck.md` — backpack capacity: 15 + STR×2 slots before "Belastet" (encumbered); items up to size 3.
- `Schnellzugriff.md` — up to 6 quick-access pouches, 1 slot each, "Klein"-sized items only.
- `Gegenstandsgrößen.md` — the sizing system: **Klein/Mittel/Groß/Sehr groß** (1–4 slots) plus a
  weight surcharge flag **Schwer (+1)/Sehr schwer (+2)**; coins stack 200/slot, ammo is untracked.

This is a **slot-based carrying-capacity system**, replacing the legacy vault's flat lb-weight
encumbrance. No actual item note, no template, and no character sheet note exist anywhere in the vault.

The per-item field schema has to be **inferred** from hidden Dataview display templates under
`zHidden\_Embeds\embed Gegenstand\` (meant to be transcluded into item notes that don't exist yet):

| Field | Meaning | Source template |
|---|---|---|
| `Größe` | item size (Klein/Mittel/Groß/Sehr groß) | weapon/armor embeds |
| `Gewicht` | weight class flag (Schwer/Sehr schwer) — **not** a literal lb number | weapon/armor embeds |
| `Kosten` | cost | weapon, armor, magic item embeds |
| `Kategorie` | weapon category (simple/martial-ish) | weapon embed |
| `Verfügbarkeit` | availability | weapon embed |
| `Hände` | one/two-handed | weapon embed |
| `Reichweite` | range | weapon embed (same field name as the legacy vault) |
| `Schaden` | damage dice | weapon embed (same as legacy) |
| `Schadensart` | damage type (link) | weapon embed (same as legacy) |
| `Eigenschaften` | trait links (e.g. `[[Finesse]]`) | weapon embed (same as legacy) |
| `Klasse` | armor category (light/medium/heavy) | armor embed |
| `RK` (display) / `RP` (formula) | armor's AC contribution — **inconsistent naming**, see below | armor embed vs. char-sheet AC formula |
| `SR` | damage reduction | armor/shield embed |
| `Stärke` | STR requirement | armor embed |
| `Heimlichkeit` | stealth disadvantage flag | armor embed |
| `BW_cap` | movement-speed cap | armor embed |
| `Art` | magic item type | magic item embed |
| `Seltenheit` | rarity | magic item embed |
| `Einstimmung` | attunement (bool) | magic item embed |
| `Verflucht` | cursed (bool) | magic item embed |
| `Voraussetzung` | requirement | magic item embed |

Tag taxonomy (from `.obsidian/plugins/supercharged-links-obsidian/data.json` + Dataview queries):
`Gegenstand`, `Gegenstand/Waffe` (+ `Klasse/Nahkampfwaffe` | `Klasse/Fernkampfwaffe/Schusswaffe` |
`Klasse/Fernkampfwaffe/Wurfwaffe`), `Gegenstand/Rüstung`, `Gegenstand/Schild`,
`Gegenstand/Magischer_Gegenstand`, and an inconsistently-named tool tag (`Gegenstand/Werkzeug` in
Dataview queries vs. bare `Werkzeug` in the Supercharged Links config).

No `icon`, `slot`, or `description` frontmatter field is used anywhere — description is free body
text, icon is CSS assigned by tag, and "equip slot" only exists as ad-hoc named link fields on a
character (`Verteidigung.Rüstung`, `Verteidigung.Schild`, `Angriff.Waffen[]`), not a generic slot system.

## 3. Signs this is genuinely a draft (not just "sparse")

- Three different plugin configs (core Templates, QuickAdd, Templater) point at **three different,
  all-nonexistent** template folders (`02 - Spielleiterbereich/Vorlagen`, `DM Bereich/Vorlagen`) —
  the item-creation templates referenced by Templater's `folder_templates`
  (`Vorlage Waffe Nahkampf.md`, `Vorlage Magischer Gegenstand.md`) don't exist in this checkout.
  There's no `02 - Spielleiterbereich` at all — only the player-facing half was exported.
- `obsidian-icon-folder/data.json` still carries leftover keys from a different, older vault
  (`_DnD_PFT/...`), and `Kampagne/Gesinnung Gruppe.md` + the Character Sheet cooldown embeds reference
  characters (Aranon, Drogan, Lucian, Niptac, Ar'go) that look like a **previous campaign's** party,
  not this one — the whole character-sheet embed system reads as scaffolding copied over, unadapted.
- Concept pages the item embeds link to (`[[Rüstungsklasse]]`, `[[Schadensreduktion]]`, `[[Finesse]]`)
  don't exist in the vault — dangling links, i.e. the rules glossary isn't finished either.
- `RK` (armor's own display table) vs. `RP`/`SR` (the AC-calculation formula reading a *linked* armor
  page) is an internal naming inconsistency — the taxonomy itself isn't settled yet.
- **No character note exists at all**, draft or otherwise. Only the character-sheet's *building
  blocks* (embeds) exist, and those hint at fields (`Verteidigung.Rüstung`, `SR`, `BW_cap`, tag
  namespace `Regeln/Nimble`) that look like a different AC/HP/movement mechanic than the current
  legacy adapter assumes (`Verteidigung.Natürliche_Rüstung + Zusätzliche_Rüstung + DEX`). Whether this
  is a evolution of the same ruleset or a distinct system ("Nimble") is **unconfirmed** — this is the
  single biggest open question, since it would affect far more than inventory (HP, AC, saves, skills).

## 4. What this means for the app's data model — recommendation

Given the above, full re-alignment (a character adapter, write-back, UI) isn't justifiable yet: there
is no real item note and no real character note to build or test against, and the ruleset itself
(not just the item schema) may be changing. Concretely done in this pass instead, as a **speculative,
explicitly unwired skeleton** — see `src/vault/adapters/endeavourItem.ts`:

- A discriminated-union item type (`EndeavourItemFrontmatter`: `weapon | armor | shield | magic_item | tool`)
  covering every field found in the embed templates above, with a doc-comment on every field noting
  it's inferred from a display template, not a confirmed real note.
- `looksLikeEndeavourItem()` / `normalizeEndeavourItem()` following the same detect+normalize shape as
  the existing adapters (`legacyCharacterSheet.ts`, `legacySpell.ts`), with unit tests using synthetic
  fixtures built from the inferred schema (there are no real item notes to use as fixtures yet).
- **Deliberately not wired into `buildVault()`** (`parseFrontmatter.ts`). Reason: the new vault's tag
  scheme (`Gegenstand/Waffe/...`) is the *same* scheme the legacy vault's weapon/armor notes already
  carry (see §1) — wiring tag-based detection into the main pipeline now would also start pulling the
  **existing legacy vault's** weapon/armor notes into `vault.items`, which changes behavior for a
  vault this app already supports and has fixtures for (`legacyCharacterSheet.test.ts` lines ~508-530
  tag weapon fixtures exactly this way). That's plausibly a *good* outcome (it finishes the "not worth
  a dedicated adapter yet" TODO), but it needs to be checked against the existing legacy-vault tests
  and behavior deliberately, not as a side effect of preparing for a vault that doesn't have real data
  yet.

## 5. Open questions for the DM (worth asking before going further)

1. Is the new char-sheet mechanic ("Regeln/Nimble", `SR`/damage reduction, `BW_cap`) a revision of the
   current ruleset, or a different system entirely? This drives whether the *existing* legacy adapter
   can be extended vs. needs a parallel one.
2. Is `Gewicht` on an item meant to be the weight-class **flag** (Schwer/Sehr schwer, per
   `Gegenstandsgrößen.md`) or a literal weight number (as the embed display table's column header
   suggests)? Right now both readings exist in the vault simultaneously.
3. `RK` vs `RP`/`SR` naming — which is authoritative for the AC/damage-reduction formula?
4. Is `Gegenstand/Werkzeug` or bare `Werkzeug` the real tool tag going forward?
5. When will real item notes / a real character note land, so the skeleton adapter can be verified
   (or corrected) against actual data instead of inferred field names?

## 6. Next step (once the vault is more final)

1. Get one real item note per category (weapon, armor, shield, magic item) and one real character
   note from the DM.
2. Diff them against `EndeavourItemFrontmatter` in `endeavourItem.ts`, fix field names/types, replace
   the synthetic test fixtures with real ones.
3. Decide, with the collision question from §4 resolved, whether to wire `endeavourItem.ts`'s
   detection into `buildVault()` (and what happens to the legacy vault's own tagged items when it is).
4. Only then start the planned inventory UI overhaul — it should target whichever schema comes out of
   step 3, not the current native/legacy split.
