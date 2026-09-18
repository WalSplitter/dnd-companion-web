/**
 * Flat, dot-namespaced dictionary. Keys stay flat (not nested objects) so `Key = keyof typeof en`
 * gives every call site autocomplete/type-checking without a separate path-typing helper. `de.ts`
 * must define the exact same key set (enforced via `satisfies Record<keyof typeof en, string>`).
 * `{{name}}` placeholders are substituted by `t()` in `I18nContext.tsx`.
 */
export const en = {
  // App chrome
  'app.brand': 'D&D Companion',
  'vaultLoader.label': 'Vault:',
  'vaultLoader.sampleData': 'Sample data',
  'vaultLoader.devData': 'Dummy data (dev)',
  'vaultLoader.loadDevVault': 'Load dummy vault (dev)',
  'vaultLoader.loadingEllipsis': 'Loading…',
  'vaultLoader.loadingProgress': 'Loading ({{done}}/{{total}})',
  'vaultLoader.saveFailed': 'Save failed: {{message}}',
  'vaultLoader.reconnect': 'Reconnect "{{name}}"',
  'vaultLoader.openVaultFolder': 'Open vault folder…',
  'vaultLoader.useSampleVault': 'Use sample vault',
  'vaultLoader.enableEditingTooltipGranted': 'Changes to HP, conditions and spell slots save straight back to the vault files',
  'vaultLoader.enableEditingTooltipNotGranted':
    'Grants this tab write access to the vault folder so HP/conditions/spell-slot edits save back to the .md files',
  'vaultLoader.editingEnabled': '🔓 Editing enabled',
  'vaultLoader.editingDeniedRetry': '🔒 Editing denied — retry',
  'vaultLoader.enableEditing': '🔒 Enable editing',

  // Ruleset detection badge
  'ruleset.badgeLabel': 'Ruleset',
  'ruleset.tooltipHeuristic': 'Best-effort guess based on vault content — not a fact.',
  'ruleset.dnd5e': 'D&D 5e',
  'ruleset.dnd5e_2024': 'D&D 5e (2024)',
  'ruleset.nimble': 'Nimble',
  'ruleset.custom': 'Custom',
  'ruleset.unknown': 'Unknown',

  // Theme switcher
  'theme.ariaLabelSuffix': 'theme',
  'theme.light': 'Light',
  'theme.dark': 'Dark',
  'theme.fluent': 'Fluent',
  'theme.purple': 'Purple',
  'theme.orange': 'Orange',
  'theme.red': 'Red',
  'theme.green': 'Green',
  'theme.blue': 'Blue',

  // Language switcher
  'language.ariaLabel': 'Language',

  // Character list / sheet routing
  'characterList.title': 'Characters',
  'characterList.emptyBefore': 'No characters found in this vault. Open a vault folder that contains files with',
  'characterList.emptyAfter': 'frontmatter.',
  'characterSheet.notFound': 'Character not found.',
  'characterSheet.backToList': 'Back to character list',

  // Sheet tabs
  'tabs.sheet': 'Sheet',
  'tabs.inventory': 'Inventory',
  'tabs.spells': 'Spells',

  // Ability scores
  'ability.str': 'Strength',
  'ability.dex': 'Dexterity',
  'ability.con': 'Constitution',
  'ability.int': 'Intelligence',
  'ability.wis': 'Wisdom',
  'ability.cha': 'Charisma',

  // Skills
  'skill.acrobatics': 'Acrobatics',
  'skill.animal_handling': 'Animal Handling',
  'skill.arcana': 'Arcana',
  'skill.athletics': 'Athletics',
  'skill.deception': 'Deception',
  'skill.history': 'History',
  'skill.insight': 'Insight',
  'skill.intimidation': 'Intimidation',
  'skill.investigation': 'Investigation',
  'skill.medicine': 'Medicine',
  'skill.nature': 'Nature',
  'skill.perception': 'Perception',
  'skill.performance': 'Performance',
  'skill.persuasion': 'Persuasion',
  'skill.religion': 'Religion',
  'skill.sleight_of_hand': 'Sleight of Hand',
  'skill.stealth': 'Stealth',
  'skill.survival': 'Survival',

  // Card titles
  'cards.abilityScores': 'Ability Scores',
  'cards.savingThrows': 'Saving Throws',
  'cards.skills': 'Skills',
  'cards.combat': 'Combat',
  'cards.hitPoints': 'Hit Points',
  'cards.deathSaves': 'Death Saves',
  'cards.conditions': 'Conditions',
  'cards.attacksSpellcasting': 'Attacks & Spellcasting',
  'cards.attacks': 'Attacks',
  'cards.about': 'About',
  'cards.sensesLanguages': 'Senses & Languages',
  'cards.featuresTraits': 'Features & Traits',
  'cards.equipped': 'Equipped',
  'cards.carried': 'Carried',
  'cards.currency': 'Currency',
  'cards.totalWeight': 'Total Weight',
  'cards.spellcasting': 'Spellcasting',
  'cards.spellsKnown': 'Spells Known',

  // Stat labels
  'stats.profBonus': 'Prof. Bonus',
  'stats.initiative': 'Initiative',
  'stats.armorClass': 'Armor Class',
  'stats.speed': 'Speed',
  'stats.ability': 'Ability',
  'stats.saveDC': 'Save DC',
  'stats.attack': 'Attack',
  'stats.spellSlots': 'Spell Slots',
  'stats.hitDice': 'Hit Dice',
  'stats.temp': 'temp',
  'stats.successes': 'Successes',
  'stats.failures': 'Failures',
  'stats.luckPoints': 'Luck Points',
  'stats.exhaustion': 'Exhaustion',
  'stats.passivePerception': 'Passive Perception',
  'stats.languages': 'Languages',
  'stats.tools': 'Tools',
  'senses.darkvision': 'Darkvision',
  'senses.blindsight': 'Blindsight',
  'senses.tremorsense': 'Tremorsense',
  'senses.truesight': 'Truesight',

  // Proficiency dots
  'proficiency.expertise': 'Expertise',
  'proficiency.proficient': 'Proficient',

  // Weapon kinds
  'weaponKind.melee': 'Melee',
  'weaponKind.ranged': 'Ranged',
  'weaponKind.thrown': 'Thrown',

  // Currency denominations
  'currency.pp': 'PP',
  'currency.gp': 'GP',
  'currency.ep': 'EP',
  'currency.sp': 'SP',
  'currency.cp': 'CP',

  // Inventory
  'inventory.nothingEquipped': 'Nothing equipped.',
  'inventory.backpackEmpty': 'Backpack is empty.',
  'inventory.unresolvedReference': 'Unresolved reference: {{name}}',
  'inventory.weightValue': '{{value}} lb',
  'inventory.weightUnit': 'lb',

  // Slot-grid inventory ("Endeavour" container/Plaetze system)
  'endeavourInventory.quickSlots': 'Quick access',
  'endeavourInventory.backpack': 'Backpack',
  'endeavourInventory.noContainers': 'No containers equipped.',
  'endeavourInventory.emptySlot': 'Empty',
  'endeavourInventory.capacityLabel': 'Slots used',
  'endeavourInventory.capacityValue': '{{used}} / {{capacity}}',
  'endeavourInventory.searchLabel': 'Find item',
  'endeavourInventory.searchPlaceholder': 'Search all items in the vault…',
  'endeavourInventory.searchNoResults': 'No matching items found.',
  'endeavourInventory.targetContainer': 'Place in',
  'endeavourInventory.quantity': 'Qty',
  'endeavourInventory.addToInventory': 'Add to inventory',
  'endeavourInventory.removeAria': 'Remove {{name}}',
  'endeavourInventory.unresolvedItem': 'Unknown item',
  'endeavourInventory.noSelection': 'Select an item to see its details.',
  'endeavourInventory.detailCost': 'Cost',
  'endeavourInventory.detailSlots': 'Slots',
  'endeavourInventory.detailStackSize': 'Max stack',
  'endeavourInventory.detailMaxSize': 'Max item size',
  'endeavourInventory.warningNoRoom': 'No room left for "{{name}}".',
  'endeavourInventory.warningTooBig': '"{{name}}" ({{size}}) is too big for this container (max {{maxSize}}).',
  'endeavourInventory.warningPartial': 'Only {{placed}} of {{requested}} placed — no room for the rest.',
  'endeavourInventory.size.klein': 'Small',
  'endeavourInventory.size.mittel': 'Medium',
  'endeavourInventory.size.gross': 'Large',
  'endeavourInventory.size.sehr_gross': 'Huge',

  // Spells
  'spells.noSpellcasting': 'This character has no spellcasting.',
  'spells.noSpellsKnown': 'No spells known.',
  'spells.cantrips': 'Cantrips',
  'spells.level': 'Level {{level}}',
  'spells.slotsRemaining': '{{remaining}}/{{max}} slots',
  'spells.cantripBadge': 'Cantrip',
  'spells.levelBadge': 'Lvl {{level}}',
  'spells.concentration': 'Concentration',
  'spells.ritual': 'Ritual',
  'spells.castingTime': 'Casting Time',
  'spells.range': 'Range',
  'spells.components': 'Components',
  'spells.duration': 'Duration',
  'spells.target': 'Target',
  'spells.saveBadge': 'DC {{dc}} {{ability}}',
  'spells.slotLevelLabel': 'Lvl {{level}}',

  // Dice rolling
  'roll.tooltipD20': 'Click to roll · Shift = advantage · Alt = disadvantage',
  'roll.tooltipDamage': 'Click to roll · Shift = critical',
  'roll.critSuffix': ' (crit)',
  'roll.critical': 'Critical!',
  'roll.fumble': 'Fumble!',
  'roll.spellAttack': 'Spell attack',
  'roll.attackSuffix': '{{name}} attack',
  'roll.damageSuffix': '{{name}} damage',
  'roll.saveSuffix': '{{label}} save',
  'roll.hitDie': 'Hit Die',

  // Wikilink popover
  'wikilink.character': 'Character',
  'wikilink.item': 'Item',
  'wikilink.spell': 'Spell',
  'wikilink.note': 'Note',
  'wikilink.unresolved': 'Unresolved',
  'wikilink.noNoteFound': 'No note found for "{{name}}".',
  'wikilink.noDescription': 'No description.',
  'wikilink.openFullSheet': 'Open full sheet →',

  // Shared
  'common.close': 'Close',

  // Accessibility labels (screen-reader only, not visually shown)
  'a11y.toggleSavingThrow': 'Toggle {{label}} saving throw proficiency',
  'a11y.cycleSkillProficiency': 'Cycle {{label}} proficiency',
  'a11y.currentHp': 'Current hit points',
  'a11y.luckPoint': 'Luck point {{n}}',
  'a11y.exhaustionLevel': 'Exhaustion level {{n}}',
  'a11y.spellSlot': 'Level {{level}} slot {{n}}',
} as const
