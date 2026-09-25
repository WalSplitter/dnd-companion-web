---
type: character
name: Borin Eisenfaust
portrait: "[[Borin Eisenfaust Portrait.svg]]"
backstory: |
  Borin diente zwanzig Jahre in der Wache von Hammerfels, bis ein Einsturz im Tiefen Stollen seinen
  halben Trupp verschüttete. Er war der Einzige, der sich zurück an die Oberfläche grub. Seitdem
  trägt er den Schuppenpanzer seines Hauptmanns und schwört, dass er niemanden mehr zurücklässt.

  In der Gruppe steht er vorne, redet wenig und hat für jede Lage einen Trinkspruch. Die Narbe an
  seiner Schulter stammt aus dem Kampf gegen die Grubenschrecken — sie ist noch nicht verheilt.
class:
  - name: Krieger
    level: 4
species: Bergzwerg
background: Soldat
alignment: Rechtschaffen Gut
experience: 2900
abilities:
  str: 16
  dex: 16
  con: 14
  int: 8
  wis: 12
  cha: 8
proficiency_bonus: 2
saving_throw_proficiencies: []
skill_proficiencies: []
nimble_attributes:
  st: 3
  bw: 3
  ko: 2
  ge: 0
  in: 1
  vs: -1
  pr: -1
  en: 1
nimble_skills:
  athletics: 3
  intimidation: 2
  survival: 2
  perception: 1
  history: 1
armor_class: 6
armor: "[[Schuppenpanzer]]"
speed: 7,5 m
hp:
  current: 21
  max: 36
  temp: 4
resilience:
  current: 5
  max: 16
senses:
  darkvision: 18 m
languages: [Gemeinsprache, Zwergisch]
attacks:
  - name: Langschwert
    kind: melee
    attack_bonus: 3
    damage_dice: 1d8
    damage_bonus: 3
    damage_type: Hieb-/Stichschaden
    range: 1,5 m
    properties: [Finesse, Parade, Vielseitig]
  - name: Wurfmesser
    kind: thrown
    attack_bonus: 3
    damage_dice: 1d4
    damage_bonus: 3
    damage_type: Stichschaden
    range: 3/6/12 m
    properties: [Wurfwaffe, Leicht, Finesse, Kritisch]
features:
  - name: Zweiter Atem
    source: Krieger 1
    description: Einmal pro Rast kannst du als Bonusaktion 1W10 + deine Kriegerstufe an [[Resilienzpunkte]]n zurückgewinnen.
  - name: Kampfstil — Verteidigung
    source: Krieger 1
    description: Solange du eine Rüstung trägst, ist deine [[Rüstungsklasse]] um 1 erhöht.
  - name: Zwergische Zähigkeit
    source: Bergzwerg
    description: Du bist im Vorteil bei Rettungswürfen gegen Gift. Dazu [[Dunkelsicht]] auf 18 m.
conditions:
  exhaustion: 1
  notes: Tiefe Schulterwunde aus dem Kampf gegen die Grubenschrecken — 1 [[Erschöpfung]], heilt mit der nächsten Sicheren Rast.
---

![[Borin Eisenfaust Portrait.svg]]

# Borin Eisenfaust

#### *Krieger 4 — Bergzwerg — Soldat — Rechtschaffen Gut*

> [!quote] „Keiner bleibt zurück."
> Borin diente zwanzig Jahre in der Wache von Hammerfels, bis ein Einsturz im Tiefen Stollen seinen
> halben Trupp verschüttete. Er war der Einzige, der sich zurück an die Oberfläche grub. Seitdem
> trägt er den Schuppenpanzer seines Hauptmanns und schwört, dass er niemanden mehr zurücklässt.

---

## ⚔️ Vitalwerte

| 🛡️ RK | 💨 Ausweichwert | 🔥 Resilienzpunkte | ❤️ Trefferpunkte | 🏃 Initiative | 👟 Bewegungsrate |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **6** | **12** | **5 / 16** | **21 / 36** (+4 temp.) | In **+1** · Bw **+3** | 7,5 m (5 Kästchen) |

- **RK 6** — [[Schuppenpanzer]] (5) + [[Holzschild]] (1) ([[Rüstungsklasse]]).
- **Ausweichwert 12** — 10 + BW +3, aber der Schuppenpanzer begrenzt auf Max BW 2 ([[Ausweichwert]]).
- **Trefferpunkte** — 4 × (7 [[Krieger]] + KO 2) = 36.
- **Resilienzpunkte** — 4 × (4 [[Krieger]] + EN 1 / 2) = 16.
- **Erschöpfung 1** — alle W20-Prüfungen −2, Bewegungsrate −1,5 m (aktuell 6 m / 4 Kästchen).

*Erfahrung: 2900 XP*

## 🎯 Attribute

| | St | Bw | Ko | Ge | In | Vs | Pr | En |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| **Wert** | **+3** | +3 | **+2** | 0 | +1 | −1 | −1 | +1 |

Primärattribute des [[Krieger]]s: **Stärke** und **Konstitution**.

## 🗡️ Fertigkeiten

*Fertigkeitswurf: W20 + Attributswert + Fertigkeitswert ([[Fertigkeiten]])*

| Fertigkeit | Attr. | Fertigkeitswert | Gesamt |
|---|:--:|:--:|:--:|
| **Athletik** | St | +3 | **+6** |
| **Überlebenskunst** | In | +2 | **+3** |
| **Wahrnehmung** | In | +1 | **+2** |
| **Einschüchterung** | Pr | +2 | **+1** |
| **Geschichte** | Vs | +1 | **0** |

## ⚔️ Angriffe

| Waffe | Angriff | Schaden | Reichweite | Eigenschaften |
|---|:--:|:--:|:--:|---|
| [[Langschwert]] | +3 (St) | 1d8 + 3 Hieb/Stich | 1,5 m | [[Finesse]], [[Parade]], [[Vielseitig]] |
| [[Wurfmesser]] | +3 (St, [[Finesse]]) | 1d4 + 3 Stich | 3/6/12 m | [[Wurfwaffe]], [[Leicht]], [[Kritisch]] |

## 🎒 Ausrüstung

- **Rüstung** — [[Schuppenpanzer]] (RK 5, Mindeststärke 2, Max BW 2) und [[Holzschild]] (RK 1)
- **Inventar** — [[Inventar Borin]] ([[Gepäck]]: 15 + St × 2 = 21 Plätze)
