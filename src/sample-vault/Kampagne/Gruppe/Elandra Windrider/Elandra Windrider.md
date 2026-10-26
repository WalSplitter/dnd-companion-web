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
  [[Flammenpfeil]]s, der ein wenig zu früh gezündet hat.
personality:
  - Notiert alles — auch mitten im Kampf.
  - Kann einer ungelösten Frage nicht widerstehen.
ideals: Wissen gehört allen, die danach suchen.
appearance: Schlank und hochgewachsen, silberblondes Haar, das sie mit einem Federkiel hochsteckt; tintenfleckige Finger.
class:
  - name: Arkanist
    level: 3
    subclass: Beschwörer der Kontrolle
knives:
  - kind: mystery
    title: "Schlüssel, nicht Anker"
    text: >-
      Seit das [[Amulett der Tiefe]] in ihrem Rucksack liegt, findet sie morgens Randnotizen in
      ihrem Zauberbuch, die sie nicht geschrieben hat. Die Handschrift ist alt und sehr ordentlich.
    play: >-
      Lies den anderen eine der fremden Randnotizen vor, als wäre es eine spannende Fußnote – und
      erst danach fällt ihr auf, dass es nicht ihre eigene ist.
    state: drawn
  - kind: enemy
    title: "Wer Altes Sylvanisch spricht"
    text: >-
      Varis Krähenfeld spricht die Sprache ihrer Enklave fließend. In Silberwald lehren sie nur drei
      Archivare – und einer davon ist ihr Onkel.
    state: drawn
  - kind: person
    title: "Meisterin Ithriel"
    text: >-
      Ihre Lehrerin im Scriptorium Arcanum verschwand vor sechs Jahren auf einer Exkursion zum
      Steinkreis über dem Moor. Elandra hat nie aufgehört, nach ihr zu fragen.
    play: >-
      Wenn der Steinkreis zur Sprache kommt, wird Elandra ungewohnt still und notiert nichts. Das
      allein sollte der Gruppe auffallen.
  - kind: crime
    title: "Das versiegelte Grimoire"
    text: >-
      Sie hat aus der verbotenen Abteilung des Scriptoriums ein Grimoire entwendet und eine
      Fälschung zurückgestellt. Fälschungen halten nicht ewig.
  - kind: secret
    title: "Der verfrühte Flammenpfeil"
    text: >-
      Die Brandspuren an ihrem Kampfstab stammen von einem Zauber, der zu früh zündete. Was sie
      verschweigt: Es stand jemand im Weg.
  - kind: prejudice
    title: "Die Bücherelfe"
    text: >-
      In der Enklave gilt, wer Bücher den Riten vorzieht, als halbe Menschenfreundin. Ihr Vater
      spricht ihren Namen nicht mehr aus.
  - kind: obligation
    title: "Die Rückkehrklausel"
    text: >-
      Ihr Stipendium verpflichtet sie, alle Forschungsergebnisse im Frühjahr beim Scriptorium
      abzuliefern. Dazu gehört streng genommen auch ein gewisses Amulett.
  - kind: heirloom
    title: "Großmutters Federkiel"
    text: >-
      Den Federkiel, mit dem sie ihr Haar hochsteckt, hat sie von ihrer Großmutter – er braucht
      angeblich nie Tinte. Sie hat Angst herauszufinden, warum.
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
  current: 9
  max: 12
  temp: 0
resilience:
  current: 3
  max: 4
senses:
  darkvision: 18 m
languages: [Gemeinsprache, Elfisch, Drakonisch]
attacks:
  - "[[Kampfstab]]"
  - "[[Dolch]]"
Merkmale:
  - "[[Elementare Zauberkunst]]"
  - "[[Begabter Forscher]]"
  - "[[Elementare Meisterschaft]]"
  - "[[Schicksal verweigern]]"
  - "[[Willenskraft]]"
features:
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

Kernattribute des [[Arkanist]]en: **Verstand** und **Entschlossenheit**.

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
