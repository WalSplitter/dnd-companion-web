---
type: character
name: Dummy Charakter
class:
  - name: Platzhalter
    level: 1
species: Unbekannt
background: Platzhalter
alignment: Unbekannt
experience: 0
abilities:
  str: 12
  dex: 12
  con: 12
  int: 12
  wis: 12
  cha: 12
proficiency_bonus: 2
saving_throw_proficiencies: []
skill_proficiencies: []
armor_class: 10
speed: 30 ft
hp:
  current: 10
  max: 10
hit_dice:
  die: d8
  total: 1
  used: 0
inventory:
  equipped:
    - "[[Platzhalter Schwert]]"
    - "[[Platzhalter Ruestung]]"
    - "[[Platzhalter Schild]]"
  carried:
    - "[[Platzhalter Bogen]]"
    - "[[Platzhalter Zaubergegenstand]]"
    - "[[Platzhalter Werkzeug]]"
currency: { cp: 12, sp: 8, ep: 0, gp: 30, pp: 1 }
---

Platzhalter-Charakter für die App-Entwicklung, solange der neue "Endeavour"-Vault noch keine echten
Charakterbögen enthält (siehe `docs/inventory-vault-alignment.md`). Beim Laden über "Dummy-Vault
laden (dev)" wird dieser Charakter zusammen mit den echten Dateien aus `Endeavour_PlayerVault` (Regeln
etc., read-only eingelesen — siehe `endeavourRealVault.ts`) angezeigt. Nur dieser Charakter + seine
Items sind lokal in `dnd-companion-web` gebündelt; der externe Vault-Ordner wird dadurch nicht
verändert. Die Items in diesem Inventar nutzen bewusst das experimentelle "Endeavour"-Tag-Schema
(`Gegenstand/Waffe/...`, siehe `src/vault/adapters/endeavourItem.ts`), damit am Inventar-UI gegen die
echte Feldstruktur (soweit aus den DM-Vorlagen ableitbar) entwickelt werden kann. Sobald der DM echte
Charakterbögen pflegt, kann dieser Ordner (`src/dev-vault/`) wieder entfernt werden.
