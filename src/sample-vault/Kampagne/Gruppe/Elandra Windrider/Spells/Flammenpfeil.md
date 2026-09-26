---
type: spell
name: Flammenpfeil
level: 0
school: Feuer
casting_time: 1 Aktion
actions: 1
range: 12 m (8 Felder)
components: [V, S]
duration: Sofort
classes: [Arkanist]
target_kind: single
damage: 1d10
damage_type: Feuerschaden
damage_scaling:
  - at_level: 5
    dice: 1d10+5
  - at_level: 10
    dice: 1d10+10
  - at_level: 15
    dice: 1d10+15
  - at_level: 20
    dice: 1d10+20
high_levels: +5 Schaden alle 5 Stufen
---

Ein Pfeil aus Glut zischt auf ein Ziel zu. Bei einem kritischen Treffer beginnt das Ziel zu [[Schwelend|schwelen]].
