import { stripRank, type ProgressionNode } from '../../vault/adapters/classProgression'
import { fold } from '../../utils/fold'

export const SKILL_ICONS = [
  'choice',
  'attribute',
  'crown',
  'skull',
  'mask',
  'target',
  'bow',
  'flame',
  'sun',
  'heart',
  'shield',
  'spirit',
  'magic',
  'eye',
  'wind',
  'leaf',
  'paw',
  'dice',
  'book',
  'sword',
  'bolt',
  'rune',
] as const
export type SkillIcon = (typeof SKILL_ICONS)[number]

/** German names a note's `Icon:` may use too. */
const ALIASES: Record<string, SkillIcon> = {
  wahl: 'choice',
  wegweiser: 'choice',
  attribut: 'attribute',
  steigerung: 'attribute',
  krone: 'crown',
  schadel: 'skull',
  maske: 'mask',
  ziel: 'target',
  bogen: 'bow',
  flamme: 'flame',
  feuer: 'flame',
  sonne: 'sun',
  licht: 'sun',
  herz: 'heart',
  heilung: 'heart',
  schild: 'shield',
  geist: 'spirit',
  magie: 'magic',
  zauber: 'magic',
  auge: 'eye',
  bewegung: 'wind',
  blatt: 'leaf',
  natur: 'leaf',
  pfote: 'paw',
  tier: 'paw',
  wurfel: 'dice',
  buch: 'book',
  wissen: 'book',
  schwert: 'sword',
  waffe: 'sword',
  blitz: 'bolt',
}

/**
 * Keywords per icon, German and English, tried in this order on the feature's name and then on its
 * description — the first icon with a match wins. Earlier entries are the more specific ones
 * (`Letzter Stoß` is a skull before it is a sword).
 */
const KEYWORDS: [SkillIcon, RegExp][] = [
  ['sword', /arsenal|waffenmeister|kampfstil|zusatzlicher angriff|extra attack|hinterhaltiger angriff|sneak attack|klinge drehen/],
  ['book', /sprache|thieves' cant/],
  ['magic', /zaubertrick|cantrip/],
  ['dice', /regeln brechen|schummel/],
  ['attribute', /steigerung|attribut|ability score|^talente?\b|\bfeat/],
  ['crown', /episch|gabe\b|boon|nemesis|erzmagier|archmage|grenzenlos|glorreich|vollkommen|meisterhaft|unvergleichlich|weiser des|mystischer meister|capstone/],
  ['skull', /\btod|nekro|death|sterben|hinrichtung|letzter stoss|todesstoss|grim/],
  ['mask', /trick|tausch|gauner|schurke|sussholz|sand|schmutzig|cheat|opportunist|diebes|tiefschlag|unsichtbar|versteck|sneak|stealth|flucht/],
  ['target', /markier|beute|\bziel|quarry|zielsicher|scharfschutze|prazis|feind/],
  ['bow', /bogen|pfeil|schuss|schutze|armbrust|fernkampf|\bbow|arrow|shot/],
  ['flame', /rausch|\bwut|zorn|feuer|brand|rage|fury|flame|fire|raserei|kampfeslust/],
  ['sun', /licht|strahl|urteil|radiant|sonne|heilig|gottlich|divine|holy|erlass|tugend|eid\b/],
  ['heart', /heil|\bleben|salbe|gnade|gnadig|segen|handauflegen|heal|life|mercy|durchschnaufen|atem|zahigkeit|ausdauer|endur/],
  ['shield', /verringer|reduzier|schild|schutz|aura|rustung|verteidig|zuflucht|unzerbrech|widerstand|protect|defen|ward|guard|unbeugsam|unerschutter|stell dich/],
  ['spirit', /geist|seele|ahnen|spirit|soul|zwielicht|huter von/],
  ['magic', /zauber|magie|magisch|mana|arkan|element|spell|magic|metamagie|beschwor|former|kontrolle|annullier|paktmagie|anrufung/],
  ['eye', /auge|blick|sicht|wahrnehm|gespur|spur|instinkt|sight|\beye|sense|gefahr|scharfes|wille\b/],
  ['wind', /blutdurst|bewegung|geschwind|fusse|sprung|abrollen|anhohe|move|speed|dash|erkunder|entkommen|ausweich|uber[ -]?all|hier druben|hierher/],
  ['leaf', /natur|wild|wald|krauter|sammler|druid|forag|herb|ahnen|berg/],
  ['paw', /tier|bestie|wolf|beast|gefahrte|companion/],
  ['dice', /gluck|wurfel|luck|dice|kopf gewinnt|schicksal/],
  ['book', /wissen|forsch|lore|study|gelehr|expertise|vielseitig|schuler|meister des|meister der/],
  ['bolt', /blitz|schub|surge|eiferer|tatendrang|zusatzlich|extra|schnell|raffiniert|aktion/],
  ['sword', /angriff|hieb|schlag|stoss|klinge|waffe|kampf|dolch|attack|strike|blade|kenne deinen/],
]

/** Lower case without accents, `ß` as `ss` — the form the keywords are written in. */
const norm = (text: string) => fold(text).replace(/ß/g, 'ss')

const icons = new WeakMap<ProgressionNode, SkillIcon>()

/** The icon for a node: its note's `Icon:`, the subclass's signpost, or the first keyword match —
 * worked out once per node. */
export function iconFor(node: ProgressionNode): SkillIcon {
  let icon = icons.get(node)
  if (!icon) icons.set(node, (icon = pickIcon(node)))
  return icon
}

function pickIcon(node: ProgressionNode): SkillIcon {
  const own = node.icon ? norm(node.icon) : undefined
  if (own && (SKILL_ICONS as readonly string[]).includes(own)) return own as SkillIcon
  if (own && ALIASES[own]) return ALIASES[own]
  if (node.kind !== 'feature') return 'choice'
  for (const text of [norm(stripRank(node.name)), norm(node.description ?? '')]) {
    for (const [icon, re] of KEYWORDS) if (re.test(text)) return icon
  }
  return 'rune'
}
