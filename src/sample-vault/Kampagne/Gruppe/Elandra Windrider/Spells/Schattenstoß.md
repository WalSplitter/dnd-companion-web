---
type: spell
name: Schattenstoß
level: 0
school: Nekrotisch
casting_time: 1 Aktion
actions: 1
range: 12 m (8 Felder)
components: [V, S]
duration: Sofort
classes: [Arkanist]
target_kind: single
damage: 1d12+KEY
damage_type: Nekrotischer Schaden
damage_scaling:
  - at_level: 5
    dice: 2d12+KEY
  - at_level: 10
    dice: 3d12+KEY
  - at_level: 15
    dice: 4d12+KEY
  - at_level: 20
    dice: 5d12+KEY
high_levels: +1d12 alle 5 Stufen
---

Ein Knäuel aus Schatten schlägt in ein Ziel. Nur einmal pro Runde wirkbar. KEY ist dein Zauberattribut.
