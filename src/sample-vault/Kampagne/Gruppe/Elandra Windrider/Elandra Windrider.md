---
type: character
name: Elandra Windrider
portrait: "[[Elandra Windrider Portrait.svg]]"
backstory: |
  Elandra wuchs unter den Archivaren der Enklave von Silberwald auf und interessierte sich schon
  früh mehr für die Theorie der Magie als für die Jagden und Riten ihres Volkes. Sie verließ die
  Enklave, um im Scriptorium Arcanum zu studieren, und reist nun, um zu erproben, was ihr kein Buch
  beibringen konnte.

  Seit sie sich der Gruppe angeschlossen hat, füllt sich ihr Zauberbuch mit Randnotizen über jede
  Formel, die im Feld anders wirkte als auf dem Papier. Ihr Kampfstab trägt die Brandspuren eines
  [[Feuerpfeil]]s, der ein wenig zu früh gezündet hat.
class:
  - name: Arkanist
    level: 3
species: Hochelfe
background: Gelehrte
alignment: Neutral Gut
experience: 900
abilities:
  str: 8
  dex: 12
  con: 12
  int: 16
  wis: 12
  cha: 10
proficiency_bonus: 2
saving_throw_proficiencies: []
skill_proficiencies: []
nimble_attributes:
  st: -1
  bw: 1
  ko: 1
  ge: 2
  in: 1
  vs: 3
  pr: 0
  en: 2
nimble_skills:
  arcana: 3
  history: 2
  investigation: 2
  medicine: 1
  insight: 1
  perception: 1
armor_class: 2
armor: "[[Lederrüstung]]"
speed: 9 m
hp:
  current: 13
  max: 18
  temp: 0
resilience:
  current: 9
  max: 12
senses:
  darkvision: 18 m
languages: [Gemeinsprache, Elfisch, Drakonisch]
attacks:
  - name: Kampfstab
    kind: melee
    attack_bonus: 2
    damage_dice: 1d6
    damage_bonus: 2
    damage_type: Wuchtschaden
    range: 1,5 m
    properties: [Parade, Finesse]
  - name: Dolch
    kind: thrown
    attack_bonus: 2
    damage_dice: 1d4
    damage_bonus: 2
    damage_type: Stichschaden
    range: 3/6/12 m
    properties: [Wurfwaffe, Leicht, Finesse]
features:
  - name: Arkane Erholung
    source: Arkanist 1
    description: Einmal pro Tag erhältst du nach einer kurzen Rast verbrauchte Zauberplätze mit einem Gesamtgrad von bis zu der Hälfte deiner Arkanisten-Stufe (aufgerundet) zurück.
  - name: Zauberbuch
    source: Arkanist 1
    description: Deine Zauber stehen in einem Zauberbuch. Neue Formeln kannst du hineinkopieren, wenn du sie findest — gewirkt wird mit [[Verstand]].
  - name: Elfenblut
    source: Hochelfe
    description: Du bist im Vorteil gegen Bezauberung, und Magie kann dich nicht in Schlaf versetzen. Dazu [[Dunkelsicht]] auf 18 m.
conditions:
  exhaustion: 0
---

![[Elandra Windrider Portrait.svg]]

# Elandra Windrider

#### *Arkanistin 3 — Hochelfe — Gelehrte — Neutral Gut*

> [!quote] Eine Gelehrte auf Wanderschaft
> Elandra wuchs unter den Archivaren der Enklave von Silberwald auf und interessierte sich schon
> früh mehr für die Theorie der Magie als für die Jagden und Riten ihres Volkes. Sie verließ die
> Enklave, um im Scriptorium Arcanum zu studieren, und reist nun, um zu erproben, was ihr kein Buch
> beibringen konnte.

---

## ⚔️ Vitalwerte

| 🛡️ RK | 💨 Ausweichwert | 🔥 Resilienzpunkte | ❤️ Trefferpunkte | 🏃 Initiative | 👟 Bewegungsrate |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **2** | **11** | **9 / 12** | **13 / 18** | In **+1** · Bw **+1** | 9 m (6 Kästchen) |

- **RK 2** — [[Lederrüstung]]; verringert eingehenden Schaden ([[Rüstungsklasse]]).
- **Ausweichwert 11** — 10 + BW +1 (Max BW der Lederrüstung ist 4, greift also nicht).
- **Trefferpunkte** — 3 × (5 [[Arkanist]] + KO 1) = 18.
- **Resilienzpunkte** — 3 × (3 [[Arkanist]] + EN 2 / 2) = 12.

*Erfahrung: 900 XP*

## 🎯 Attribute

| | St | Bw | Ko | Ge | In | Vs | Pr | En |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Wert** | −1 | +1 | +1 | +2 | +1 | **+3** | 0 | **+2** |

Primärattribute des [[Arkanist]]en: **Verstand** und **Entschlossenheit**.

## 🗡️ Fertigkeiten

*Fertigkeitswurf: W20 + Attributswert + Fertigkeitswert ([[Fertigkeiten]])*

| Fertigkeit | Attr. | Fertigkeitswert | Gesamt |
|---|:--:|:--:|:--:|
| **Magiekunde** | Vs | +3 | **+6** |
| **Geschichte** | Vs | +2 | **+5** |
| **Nachforschung** | Vs | +2 | **+5** |
| **Heilkunde** | Vs | +1 | **+4** |
| **Einsicht** | In | +1 | **+2** |
| **Wahrnehmung** | In | +1 | **+2** |

## ⚔️ Angriffe

| Waffe | Angriff | Schaden | Reichweite | Eigenschaften |
|---|:--:|:--:|:--:|---|
| [[Kampfstab]] | +2 (Ge, [[Finesse]]) | 1d6 + 2 Wucht | 1,5 m | [[Parade]], [[Finesse]] |
| [[Dolch]] | +2 (Ge, [[Finesse]]) | 1d4 + 2 Stich | 3/6/12 m | [[Wurfwaffe]], [[Leicht]] |

## 🎒 Ausrüstung & Zauber

- **Rüstung** — [[Lederrüstung]] (RK 2, Max BW 4)
- **Inventar** — [[Inventar Elandra]] ([[Gepäck]]: 15 + St × 2 = 13 Plätze)
- **Zauber** — [[Spell Sheet Elandra]] (Zauberattribut [[Verstand]] +3)
