---
type: character
name: Fenn Flinkfinger
portrait: "[[Fenn Flinkfinger Portrait.svg]]"
backstory: |
  Fenn wuchs in den Hafengassen von Salzmarsch auf, wo man als Halbling entweder übersehen oder
  getreten wird. Er entschied sich fürs Übersehenwerden und machte daraus ein Handwerk. Als er beim
  falschen Kaufmann das falsche Amulett stahl, hatte er plötzlich die Diebesgilde und die Stadtwache
  gleichzeitig am Hals — die Gruppe war schlicht der schnellste Weg aus der Stadt.

  Inzwischen behauptet er, nur noch „Wertgegenstände zu befreien, die niemand vermisst". Elandra
  führt eine Liste der Dinge, die aus ihrem Rucksack verschwunden und wieder aufgetaucht sind.
personality:
  - Redet ununterbrochen, vor allem, wenn er lügt.
  - Zählt beim Betreten eines Raumes zuerst die Ausgänge.
ideals: Freiheit — und ein voller Geldbeutel, um sie zu genießen.
bonds: Seine kleine Schwester Pip, die noch in Salzmarsch lebt und der er jeden Monat Geld schickt.
flaws: Kann an keinem unbewachten Wertgegenstand vorbeigehen.
appearance:
  age: 24
  height: 0,95 m
  weight: 18 kg
  eyes: Haselnussbraun, immer in Bewegung
  hair: Lockig und schwarz, unter einer abgegriffenen Kapuze
class:
  - name: Gauner
    level: 3
species: Halbling
background: Krimineller
alignment: Chaotisch Neutral
experience: 900
abilities:
  str: 8
  dex: 16
  con: 12
  int: 14
  wis: 12
  cha: 12
proficiency_bonus: 2
saving_throw_proficiencies: []
skill_proficiencies: []
nimble_attributes:
  st: -1
  bw: 3
  ko: 1
  ge: 3
  in: 1
  vs: 2
  pr: 1
  en: 0
nimble_skills:
  stealth: 3
  sleight_of_hand: 3
  acrobatics: 2
  deception: 2
  investigation: 1
  perception: 1
armor_class: 2
armor: "[[Lederrüstung]]"
cloak: "[[Reiseumhang]]"
gloves: "[[Lederhandschuhe]]"
speed: 7,5 m
hp:
  current: 7
  max: 12
  temp: 0
resilience:
  current: 8
  max: 8
languages: [Gemeinsprache, Halblingisch, Diebessprache]
attacks:
  - "[[Rapier]]"
  - "[[Dolch]]"
features:
  - name: Die Regeln brechen
    source: Gauner 1
    description: Einmal pro Kampf darfst du nach einem Wurf einen deiner Würfel auf eine Zahl deiner Wahl drehen — solange du die Gruppe dabei nicht ansiehst.
    usage: action
  - name: Hinterhältiger Angriff
    source: Gauner 1
    description: Triffst du eine Kreatur, die du überrascht hast oder neben der ein Verbündeter steht, verursachst du 2W6 zusätzlichen Schaden. Einmal pro Zug.
  - name: Schmutziger Trick
    source: Gauner 2
    description: Für 1 [[Aktionspunkte|AP]] wirfst du Taschensand oder setzt einen Tiefschlag. Das Ziel ist bis zum Ende deines nächsten Zuges im Nachteil bei Angriffen.
    usage: action
  - name: Halblingsglück
    source: Halbling
    description: Würfelst du bei einem W20-Wurf eine 1, darfst du neu würfeln und musst das neue Ergebnis verwenden.
conditions:
  exhaustion: 0
---

![[Fenn Flinkfinger Portrait.svg]]

# Fenn Flinkfinger

#### *Gauner 3 — Halbling — Krimineller — Chaotisch Neutral*

> [!quote] „Gestohlen? Ich hab es nur früher gefunden als du."
> Fenn wuchs in den Hafengassen von Salzmarsch auf, wo man als Halbling entweder übersehen oder
> getreten wird. Er entschied sich fürs Übersehenwerden und machte daraus ein Handwerk.

---

## ⚔️ Vitalwerte

| 🛡️ RK | 💨 Ausweichwert | 🔥 Resilienzpunkte | ❤️ Trefferpunkte | 🏃 Initiative | 👟 Bewegungsrate |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **2** | **13** | **8 / 8** | **7 / 12** | In **+1** · Bw **+3** | 7,5 m (5 Kästchen) |

- **RK 2** — [[Lederrüstung]]; verringert eingehenden Schaden ([[Rüstungsklasse]]).
- **Ausweichwert 13** — 10 + BW +3 (Max BW der Lederrüstung ist 4, greift also nicht).
- **Trefferpunkte** — 4 × (2 [[Gauner]] + KO 1) = 12.
- **Resilienzpunkte** — 4 × (2 [[Gauner]] + EN 0 / 2) = 8.

*Erfahrung: 900 XP*

## 🎯 Attribute

| | St | Bw | Ko | Ge | In | Vs | Pr | En |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Wert** | −1 | +3 | +1 | **+3** | +1 | **+2** | +1 | 0 |

Kernattribute des [[Gauner]]s: **Geschick** und **Verstand**.

## 🗡️ Fertigkeiten

*Fertigkeitswurf: W20 + Attributswert + Fertigkeitswert ([[Fertigkeiten]])*

| Fertigkeit | Attr. | Fertigkeitswert | Gesamt |
|---|:--:|:--:|:--:|
| **Heimlichkeit** | Ge | +3 | **+6** |
| **Fingerfertigkeit** | Ge | +3 | **+6** |
| **Akrobatik** | Bw | +2 | **+5** |
| **Täuschen** | Pr | +2 | **+3** |
| **Nachforschung** | Vs | +1 | **+3** |
| **Wahrnehmung** | In | +1 | **+2** |

## ⚔️ Angriffe

| Waffe | Angriff | Schaden | Reichweite | Eigenschaften |
|---|:--:|:--:|:--:|---|
| [[Rapier]] | +3 (Ge, [[Finesse]]) | 2d4 + 3 Stich | 1,5 m | [[Finesse]], [[Parade]], [[Kritisch]], [[Leicht]] |
| [[Dolch]] | +3 (Ge, [[Finesse]]) | 1d4 + 3 Stich | 3/6/12 m | [[Wurfwaffe]], [[Leicht]] |

## 🎒 Ausrüstung

- **Rüstung** — [[Lederrüstung]] (RK 2, Max BW 4)
- **Inventar** — [[Inventar Fenn]] ([[Gepäck]]: 15 + St × 2 = 13 Plätze)
