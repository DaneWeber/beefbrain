/**
 * Emoji shown beside each D&D 3.5 skill on the sheet, as the CLDR short names
 * the LaTeX `emoji` package takes (`\emoji{knot}`). Every skill in
 * bnb-core/catalogs/dnd35/skills.yaml has an entry; a test holds the two in
 * step.
 *
 * Subtype keys (`knowledge-arcana`, `craft-traps`) get their own entry where a
 * distinct icon helps tell several rows of the same skill apart, and otherwise
 * fall back to the base skill's icon.
 */
export const SKILL_ICONS: Record<string, string> = {
  appraise: 'gem-stone',
  balance: 'balance-scale',
  bluff: 'joker',
  climb: 'person-climbing',
  concentration: 'person-in-lotus-position',
  craft: 'hammer',
  'craft-alchemy': 'alembic',
  'craft-arrowmaking': 'bow-and-arrow',
  'craft-bowmaking': 'bow-and-arrow',
  'craft-traps': 'mouse-trap',
  'decipher-script': 'scroll',
  diplomacy: 'handshake',
  'disable-device': 'wrench',
  disguise: 'disguised-face',
  'escape-artist': 'chains',
  forgery: 'fountain-pen',
  'gather-information': 'beer-mug',
  'handle-animal': 'paw-prints',
  heal: 'mending-heart',
  hide: 'ninja',
  intimidate: 'angry-face',
  jump: 'kangaroo',
  knowledge: 'books',
  'knowledge-arcana': 'crystal-ball',
  'knowledge-architecture-and-engineering': 'classical-building',
  'knowledge-arch-eng': 'classical-building',
  'knowledge-dungeoneering': 'pick',
  'knowledge-geography': 'world-map',
  'knowledge-history': 'amphora',
  'knowledge-local': 'houses',
  'knowledge-nature': 'herb',
  'knowledge-nobility-and-royalty': 'crown',
  'knowledge-nobility': 'crown',
  'knowledge-religion': 'folded-hands',
  'knowledge-the-planes': 'milky-way',
  'knowledge-planes': 'milky-way',
  listen: 'ear',
  'move-silently': 'shushing-face',
  'open-lock': 'locked',
  perform: 'performing-arts',
  profession: 'coin',
  'profession-fisherman': 'fishing-pole',
  ride: 'horse',
  search: 'magnifying-glass-tilted-left',
  'sense-motive': 'face-with-raised-eyebrow',
  'sleight-of-hand': 'purse',
  'speak-language': 'speech-balloon',
  spellcraft: 'sparkles',
  spot: 'eyes',
  survival: 'camping',
  swim: 'person-swimming',
  tumble: 'person-cartwheeling',
  'use-magic-device': 'magic-wand',
  'use-rope': 'knot',
}

/**
 * The icon for a skill key, trying the full key and then dropping trailing
 * `-segment`s, so `knowledge-religion-pelor` finds `knowledge-religion` and
 * `perform-reed-flute` finds `perform`. Some sheets abbreviate Knowledge to
 * `know-`, which is read as `knowledge-`. Returns '' for a skill with no icon.
 */
export function getSkillIcon(skillKey: string): string {
  const segments = skillKey.toLowerCase().split('-')
  if (segments[0] === 'know') {
    segments[0] = 'knowledge'
  }
  for (let length = segments.length; length > 0; length--) {
    const icon = SKILL_ICONS[segments.slice(0, length).join('-')]
    if (icon) {
      return icon
    }
  }
  return ''
}
