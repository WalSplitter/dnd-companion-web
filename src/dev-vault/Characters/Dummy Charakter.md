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
endeavour_inventory:
  containers:
    - container: "[[Rucksack (Groß)]]"
      items:
        - "[[Schaufel]]"
        - "[[Blendlaterne]]"
        - "[[Platzhalter Schwert]]"
    - container: "[[Gürteltasche]]"
      items:
        - "[[Köcher]]"
    - container: "[[Gürteltasche]]"
      items: []
currency: { cp: 12, sp: 8, ep: 0, gp: 30, pp: 1 }
---

Platzhalter-Charakter für die App-Entwicklung, solange der neue "Endeavour"-Vault noch keine echten
Charakterbögen enthält (siehe `docs/inventory-vault-alignment.md`). Beim Laden über "Dummy-Vault
laden (dev)" wird dieser Charakter zusammen mit den echten Dateien aus `Endeavour_PlayerVault` (Regeln
etc., read-only eingelesen — siehe `endeavourRealVault.ts`) angezeigt. Nur dieser Charakter + seine
Items sind lokal in `dnd-companion-web` gebündelt; der externe Vault-Ordner wird dadurch nicht
verändert.

`endeavour_inventory` nutzt das neue Platz-Raster-Inventar (siehe
`src/features/inventory/components/EndeavourInventoryGrid.tsx`): der Rucksack (Groß), die Ausrüstung
und die Gürteltasche sind 1:1 die realen, vom DM gelieferten Beispiel-Dateien (Tags
`Gegenstand/Behälter`/`Gegenstand/Ausrüstung`, Felder `Kosten`/`Plaetze`/`MaxGroesse`/`Stapelgroesse`)
— nur `Platzhalter Trank.md` (stapelbares Verbrauchsgut zum Testen der Mengen-Eingabe) und die
Waffen/Rüstungs/Schild/Magie-Platzhalter sind erfunden, da es dafür noch keine reale Beispieldatei
gibt (sie nutzen weiterhin das ältere, spekulative Größe/Gewicht-Schema statt `Plaetze`). Das Zelt ist
bewusst nicht vorplatziert, sondern nur über die Suche zu finden — es passt wegen `Plaetze: 4` ("Sehr
Groß") nicht in den Rucksack (`MaxGroesse: Groß`), gut zum Live-Testen der Größenprüfung. Sobald der DM
echte Charakterbögen pflegt, kann dieser Ordner (`src/dev-vault/`) wieder entfernt werden.
