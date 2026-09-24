---
type: character
name: Elandra Windrider
class:
  - name: Wizard
    level: 5
    subclass: School of Evocation
species: Elf (High Elf)
background: Sage
alignment: Neutral Good
experience: 6500
abilities:
  str: 8
  dex: 14
  con: 13
  int: 17
  wis: 12
  cha: 10
proficiency_bonus: 3
saving_throw_proficiencies: [int, wis]
skill_proficiencies: [arcana, history, investigation, insight]
skill_expertise: [arcana]
armor_class: 12
speed: 30 ft
hp:
  current: 27
  max: 38
  temp: 0
hit_dice:
  die: d6
  total: 5
  used: 1
death_saves:
  successes: 0
  failures: 0
senses:
  darkvision: 60 ft
languages: [Common, Elvish, Draconic]
tool_proficiencies: ["Calligrapher's Supplies"]
inventory:
  equipped: ["[[Quarterstaff]]", "[[Component Pouch]]"]
  carried: ["[[Spellbook]]", "[[Potion of Healing]]"]
currency: { cp: 0, sp: 0, gp: 45 }
spellcasting:
  ability: int
  slots:
    "1": { max: 4, used: 1 }
    "2": { max: 3, used: 0 }
    "3": { max: 2, used: 0 }
spells_known:
  - "[[Fire Bolt]]"
  - "[[Ray of Frost]]"
  - "[[Prestidigitation]]"
  - "[[Magic Missile]]"
  - "[[Mage Armor]]"
  - "[[Shield]]"
  - "[[Misty Step]]"
  - "[[Scorching Ray]]"
  - "[[Fireball]]"
features:
  - name: Arcane Recovery
    source: Wizard 1
    description: Once per day when you finish a Short Rest, you can recover expended spell slots with a combined level equal to half your Wizard level (rounded up).
  - name: Evocation Savant
    source: Evocation Wizard 3
    description: The gold and time you must spend to copy an Evocation spell into your spellbook is halved.
  - name: Sculpt Spells
    source: Evocation Wizard 3
    description: When you cast an Evocation spell that affects other creatures, you can choose a number of them equal to 1 + the spell's level; the chosen creatures automatically succeed on their saving throws and take no damage if they would normally take half on a success.
  - name: Fey Ancestry
    source: Elf
    description: Advantage on saving throws against being Charmed, and magic can't put you to sleep.
---

Elandra grew up among the archivists of the Silverwood Enclave, more interested in the theory of evocation magic than in the hunts and rites of her kin. She left to study at the Scriptorium Arcanum and now travels to test what the books never taught her.
