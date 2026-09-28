import { escapeLatexText } from './renderTemplate'
import { formatTitleKey } from './text'
import {
  formatComponentKey,
  getArrayFirst,
  formatSigned,
  isNonZeroComponent,
  sortComponentEntries,
  toRecord,
} from './components'

// The rows of the Actions page (weapons, full attacks, special attacks,
// attack options, spell-like abilities) and of the Build page's feats, class
// abilities and special abilities. Each builder returns template macro
// calls with every cell escaped, for a {{{...}}} token.

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isStringList(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((entry) => typeof entry === 'string')
  )
}

export function macro(name: string, cells: string[]): string {
  return `\\${name}{${cells.map(escapeLatexText).join('}{')}}`
}

// An attack bonus may list one bonus per attack ("+10/+10/+5"), and damage
// may add more dice ("2d6+12+1d6 cold"); a break after each slash, and after
// a plus that adds dice, lets either wrap in its narrow cell without
// parting a sign from its number.
function breakableCell(text: string): string {
  return escapeLatexText(text).replace(/\/|\+(?=\d+d\d)/g, '$&\\allowbreak ')
}

// Keys under combat.attack that the Attack block and the weapon tables print;
// any other key there is a special attack (`sneak-attack: +2d6`).
const ATTACK_KEYS = new Set([
  'bab',
  'full-bab',
  'melee',
  'ranged',
  'grapple',
  'full-attack',
])

// A range written as a weapon tag: `110ft`, `10ft/50ft`, `60 ft`.
const RANGE_TAG = /^\d+\s*ft(?:\s*\/\s*\d+\s*ft)?$/i

// `+12`, or `+12/+7` for a weapon listing an attack bonus per attack.
function formatAttackBonus(value: unknown): string {
  const bonuses = Array.isArray(value) ? value : [value]
  return bonuses.map(formatSigned).join('/')
}

// Tags are written as slugs (`good-2d6-vs-evil`); hyphens between words read
// as spaces, but a minus sign (`2 arrows at -4`) stays.
function formatTag(tag: string): string {
  return tag.replace(/(\w)-(?=\w)/g, '$1 ')
}

function words(text: string): string[] {
  return text.toLowerCase().split(/[\s+-]+/)
}

/**
 * A weapon is `[attack, damage, crit, {attack sources}, {damage sources},
 * ..., [tags]]`.
 */
interface WeaponSummary {
  name: string
  attack: string
  damage: string
  crit: string
  range: string
  sources: string
}

function summarizeWeapon(key: string, weapon: unknown[]): WeaponSummary {
  const tags = [...weapon].reverse().find(isStringList) ?? []
  const nameWords = new Set(words(key))
  const range = tags.filter((tag) => RANGE_TAG.test(tag))
  // A tag that only repeats the weapon's name (`sickle` on sickle-1-solo)
  // says nothing new.
  const notes = tags
    .filter((tag) => !RANGE_TAG.test(tag))
    .filter((tag) => !words(tag).every((word) => nameWords.has(word)))
    .map(formatTag)

  // The `_` source is the base melee or ranged bonus, which the Attack block
  // already explains, so a weapon lists only what it adds to that.
  const attackSources = sortComponentEntries(
    Object.entries(toRecord(weapon[3])).filter(
      ([source, value]) => !source.startsWith('_') && isNonZeroComponent(value),
    ),
  ).map(
    ([source, value]) => `${formatComponentKey(source)} ${formatSigned(value)}`,
  )
  const damageSources = sortComponentEntries(
    Object.entries(toRecord(weapon[4])).filter(
      ([source, value]) => !source.startsWith('_') && isNonZeroComponent(value),
    ),
  ).map(
    ([source, value]) => `${formatComponentKey(source)} ${formatSigned(value)}`,
  )

  const sources = [
    attackSources.join(', '),
    damageSources.length > 0 ? `Dmg ${damageSources.join(', ')}` : '',
    notes.join(', '),
  ].filter((part) => part)

  return {
    name: formatTitleKey(key),
    attack: formatAttackBonus(weapon[0]),
    damage: String(weapon[1] ?? ''),
    crit: String(weapon[2] ?? ''),
    range: range.join(', '),
    sources: sources.join('; '),
  }
}

function getWeapons(group: unknown): WeaponSummary[] {
  return Object.entries(toRecord(group))
    .filter(
      ([key, value]) =>
        !key.startsWith('_') && key !== 'full-attack' && Array.isArray(value),
    )
    .map(([key, value]) => summarizeWeapon(key, value as unknown[]))
}

// A weapon row: name, attack bonus, damage, then the other cells.
function weaponRow(
  name: string,
  weapon: WeaponSummary,
  cells: string[],
): string {
  const rest = cells.map((cell) => `{${escapeLatexText(cell)}}`).join('')
  return `\\${name}{${escapeLatexText(weapon.name)}}{${breakableCell(weapon.attack)}}{${breakableCell(weapon.damage)}}${rest}`
}

/**
 * One `\meleerow` per melee weapon: name, attack, damage, crit, and the
 * sources of its attack and damage with any tags. `\nonerow` when there are
 * none.
 */
export function buildMeleeRows(attack: Record<string, unknown>): string {
  const weapons = getWeapons(attack.melee)
  if (weapons.length === 0) {
    return '\\nonerow{5}'
  }
  return weapons
    .map((weapon) =>
      weaponRow('meleerow', weapon, [weapon.crit, weapon.sources]),
    )
    .join('\n')
}

/** As buildMeleeRows, with the range tag in a column of its own. */
export function buildRangedRows(attack: Record<string, unknown>): string {
  const weapons = getWeapons(attack.ranged)
  if (weapons.length === 0) {
    return '\\nonerow{6}'
  }
  return weapons
    .map((weapon) =>
      weaponRow('rangedrow', weapon, [
        weapon.range,
        weapon.crit,
        weapon.sources,
      ]),
    )
    .join('\n')
}

/**
 * Free-form detail as one line of text: a string as written, a list joined,
 * a record as "Key value" pairs (`{main: +10/+5, helm: 7}` ->
 * "Main +10/+5, Helm +7").
 */
export function formatDetail(value: unknown): string {
  if (value === null || value === undefined || value === true) {
    return ''
  }
  if (Array.isArray(value)) {
    return value
      .map(formatDetail)
      .filter((part) => part)
      .join('; ')
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, entry]) => {
        const text =
          typeof entry === 'number' ? formatSigned(entry) : formatDetail(entry)
        return text ? `${formatTitleKey(key)} ${text}` : formatTitleKey(key)
      })
      .join(', ')
  }
  return String(value)
}

// One attack of a full-attack list: `[bite, 13, 1d8+6, x2]`.
function formatFullAttackEntry(entry: unknown): string {
  if (!Array.isArray(entry)) {
    return formatDetail(entry)
  }
  const [name, bonus, ...rest] = entry
  const details = rest.map(String).join(', ')
  const head = `${formatTitleKey(String(name))} ${formatAttackBonus(bonus)}`
  return details ? `${head} (${details})` : head
}

/**
 * A block of `\actionrow{label}{text}` rows under a `\blockrule`, or nothing
 * when there are no rows, so a character without them gets no empty block.
 */
function actionBlock(title: string, rows: [string, string][]): string {
  if (rows.length === 0) {
    return ''
  }
  return [
    '\\blockrule',
    `\\begin{actionblock}{${escapeLatexText(title)}}`,
    ...rows.map((row) => macro('actionrow', row)),
    '\\end{actionblock}',
  ].join('\n')
}

/**
 * Full-attack routines, from `combat.attack.full-attack` (named routines) and
 * a `full-attack` list under melee or ranged (one routine of attacks).
 */
export function buildFullAttackBlock(attack: Record<string, unknown>): string {
  const rows: [string, string][] = Object.entries(
    toRecord(attack['full-attack']),
  ).map(([name, routine]) => [formatTitleKey(name), formatDetail(routine)])
  const groups: [string, string][] = [
    ['melee', 'Melee'],
    ['ranged', 'Ranged'],
  ]
  for (const [group, label] of groups) {
    const routine = toRecord(attack[group])['full-attack']
    if (Array.isArray(routine)) {
      rows.push([label, routine.map(formatFullAttackEntry).join(', ')])
    } else if (routine !== undefined) {
      rows.push([label, formatDetail(routine)])
    }
  }
  return actionBlock('Full Attack', rows)
}

/**
 * One `\\statrow` per special attack, for the Attack block: anything else
 * under `combat.attack` (`sneak-attack: +2d6`) and every entry of
 * `combat.special-attacks` (`line-of-force: [4d8, 60ft line, ...]`). The
 * first value is the attack's total, the rest its detail.
 */
export function buildSpecialAttackRows(
  combat: Record<string, unknown>,
): string {
  const attack = toRecord(combat.attack)
  const entries = [
    ...Object.entries(attack).filter(
      ([key]) => !key.startsWith('_') && !ATTACK_KEYS.has(key),
    ),
    ...Object.entries(toRecord(combat['special-attacks'])).filter(
      ([key]) => !key.startsWith('_'),
    ),
  ]
  return entries
    .map(([name, value]) => {
      const [total, ...detail] = Array.isArray(value) ? value : [value]
      const shown = isRecord(total) ? '' : formatDetail(total)
      // The icon is our own CLDR name, which escaping leaves as it is.
      return macro('statrow', [
        'collision',
        formatTitleKey(name),
        shown,
        formatDetail(isRecord(total) ? [total, ...detail] : detail),
      ])
    })
    .join('\n')
}

// Effect targets whose last path segment reads badly title-cased.
const TARGET_LABELS: Record<string, string> = {
  ac: 'AC',
  'touch-ac': 'Touch AC',
  'flat-footed-ac': 'Flat-Footed AC',
  hp: 'HP',
  'max-hp': 'Max HP',
}

// A path's last segment names the target, except `_`, the base of a group
// (`combat.attack.melee._` is the melee bonus). A bracket picks a channel of
// a weapon (`longsword[0]`) and is not part of its name.
function formatTarget(path: string): string {
  const segments = path.replace(/\[.*\]$/, '').split('.')
  const last =
    segments.at(-1) === '_' ? (segments.at(-2) ?? '_') : (segments.at(-1) ?? '')
  return TARGET_LABELS[last] ?? formatTitleKey(last)
}

// A feat or trait's name as its data slugs it: `Weapon Focus (Longsword)` ->
// `weapon-focus-longsword`.
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * How one effect reads: who owns it (its feat or trait, slugged) decides
 * what goes without saying. A bonus key named for the owner
 * (`weapon-focus-longsword: 1` on Weapon Focus) is dropped, leaving
 * "Longsword +1", and a note that opens with the owner's name ("Blind
 * Fight: reroll concealment misses") loses the name.
 */
interface EffectOwner {
  slug: string
}

function isOwnKey(key: string, owner: EffectOwner): boolean {
  return (
    owner.slug.length > 0 &&
    (owner.slug.startsWith(key) || key.startsWith(owner.slug))
  )
}

function formatNote(note: string, owner: EffectOwner): string {
  const named = /^([^:]+):\s+(.+)$/.exec(note)
  return named?.[1] && named[2] && slugify(named[1]) === owner.slug
    ? named[2]
    : note
}

// A bonus dict: `{atk: 1}` or `{listen: 2, spot: 2}`, each key a channel, a
// target or the owner, each value a bonus.
function formatBonuses(
  bonuses: Record<string, unknown>,
  owner: EffectOwner,
): string {
  return Object.entries(bonuses)
    .map(([key, value]) =>
      isOwnKey(key, owner)
        ? formatSigned(value)
        : `${formatComponentKey(key)} ${formatSigned(value)}`,
    )
    .join(', ')
}

/**
 * One effect, as `docs/bnb-core-item-feat-effects.md` defines it
 * (`[target, bonuses?, note?]`), or any of the older shapes the party data
 * still uses: a bare note, `[target, 2]`, `[{jump: 2}]`, `[note]`.
 */
function formatEffect(effect: unknown, owner: EffectOwner): string {
  const each = (parts: unknown[]) =>
    parts
      .map((part) => formatEffect(part, owner))
      .filter((part) => part)
      .join('; ')
  if (typeof effect === 'string') {
    return formatNote(effect, owner)
  }
  if (isRecord(effect)) {
    return formatBonuses(effect, owner)
  }
  if (!Array.isArray(effect) || effect.length === 0) {
    return ''
  }
  // A list of effects.
  if (effect.every(Array.isArray)) {
    return each(effect)
  }
  const [first, ...rest] = effect
  // A target is a path or a slug; a note has spaces. A lone string is a note.
  if (typeof first !== 'string' || rest.length === 0 || /\s/.test(first)) {
    return each(effect)
  }
  const target = formatTarget(first)
  // A note is written as a full sentence naming what it is about ("Blind
  // Fight: reroll concealment misses"); a bare reminder is told its target
  // ("Swim: +8 for special actions").
  if (rest.every((part) => typeof part === 'string')) {
    return rest
      .map((note) => {
        const shown = formatNote(note, owner)
        return shown !== note || note.includes(':')
          ? shown
          : `${target}: ${note}`
      })
      .join('; ')
  }
  const parts = rest.map((part) =>
    typeof part === 'number' ? formatSigned(part) : formatEffect(part, owner),
  )
  // A bare number, or a bonus the owner names, reads "Initiative +4"; any
  // other bonus names its channel: "Bastard Sword: Dmg +2".
  const plain = rest.every(
    (part) =>
      typeof part === 'number' ||
      typeof part === 'string' ||
      (isRecord(part) &&
        Object.keys(part).every((key) => isOwnKey(key, owner))),
  )
  return plain
    ? `${target} ${parts.filter((part) => part).join('; ')}`
    : `${target}: ${parts.filter((part) => part).join('; ')}`
}

// Where a feat came from: `{level: 3}` -> "Level 3", `{class: cleric}` ->
// "Cleric", `{were-rat: bonus}` -> "Were Rat Bonus".
function formatFeatSource(source: unknown): string {
  return Object.entries(toRecord(source))
    .map(([key, value]) =>
      key === 'class'
        ? formatTitleKey(String(value))
        : `${formatTitleKey(key)} ${formatTitleKey(String(value))}`,
    )
    .join(', ')
}

/**
 * One `\featrow` per feat: name, what it does, where it came from. A feat is
 * `[name, source, effects?]`, or just a name.
 */
export function buildFeatRows(special: Record<string, unknown>): string {
  const feats = Array.isArray(special.feats) ? special.feats : []
  if (feats.length === 0) {
    return '\\featnone'
  }
  return feats
    .map((feat) => {
      const [name, effect, source] = summarizeFeat(feat)
      return macro('featrow', [name, effect, source])
    })
    .join('\n')
}

// A feat's name, what it does and where it came from.
function summarizeFeat(feat: unknown): [string, string, string] {
  const [name, source, ...effects] = Array.isArray(feat) ? feat : [feat]
  const owner = { slug: slugify(String(name ?? '')) }
  return [
    String(name ?? ''),
    effects
      .map((effect) => formatEffect(effect, owner))
      .filter((part) => part)
      .join('; '),
    formatFeatSource(source),
  ]
}

/**
 * A trait written as text splits into a name and its detail at a colon
 * ("Favored Enemy: Humans, Giants") or a closing parenthetical ("Keen Senses
 * (2x normal illumination)"), so the name reads at a glance.
 */
function splitTraitText(text: string): [string, string] {
  const colon = /^([^:()]+):\s+(.+)$/.exec(text)
  if (colon?.[1] && colon[2]) {
    return [colon[1], colon[2]]
  }
  // An ability type, (Ex), (Su) or (Sp), belongs with the name.
  const paren = /^(.+?)\s+\(([^()]*)\)$/.exec(text)
  if (paren?.[1] && paren[2] && !/^(?:Ex|Su|Sp)$/.test(paren[2])) {
    return [paren[1], paren[2]]
  }
  return [text, '']
}

/**
 * One entry of a trait list: text, or `[name, source-or-effects...]` like
 * Runa's `[Rapid Shot, {combat-style: 2}]`.
 */
export function formatTrait(entry: unknown): [string, string] {
  if (Array.isArray(entry)) {
    const [name, ...rest] = entry
    const owner = { slug: slugify(String(name ?? '')) }
    const detail = rest
      .map((part) =>
        isRecord(part) ? formatFeatSource(part) : formatEffect(part, owner),
      )
      .filter((part) => part)
      .join('; ')
    return [String(name ?? ''), detail]
  }
  if (typeof entry === 'string') {
    return splitTraitText(entry)
  }
  return [formatDetail(entry), '']
}

interface TraitGroup {
  /** '' for rows the data does not group. */
  title: string
  rows: [string, string][]
  /** Each row's data as written, to tell what the row is about. */
  entries: unknown[]
}

/**
 * The rows of one `special` key. A list is a list of traits. A record is
 * either keyed by class (`ranger: [Track, ...]`), each class a group of its
 * own, or keyed by ability (`turn-undead: (+3) 4/day`), each an ability.
 */
function traitGroups(
  title: string,
  value: unknown,
  classes: Set<string>,
): TraitGroup[] {
  if (Array.isArray(value)) {
    return [{ title, rows: value.map(formatTrait), entries: value }]
  }
  if (!isRecord(value)) {
    return value
      ? [{ title, rows: [[formatDetail(value), '']], entries: [value] }]
      : []
  }
  const groups: TraitGroup[] = []
  const abilities: TraitGroup = { title, rows: [], entries: [] }
  for (const [key, entry] of Object.entries(value)) {
    if (key.startsWith('_')) {
      continue
    }
    if (classes.has(key) && Array.isArray(entry)) {
      groups.push({
        title: formatTitleKey(key),
        rows: entry.map(formatTrait),
        entries: entry,
      })
    } else {
      abilities.rows.push([formatTitleKey(key), formatDetail(entry)])
      abilities.entries.push([key, entry])
    }
  }
  return abilities.rows.length > 0 ? [abilities, ...groups] : groups
}

function traitRows(groups: TraitGroup[]): string {
  return groups
    .filter((group) => group.rows.length > 0)
    .map((group) =>
      [
        group.title ? macro('traitgroup', [group.title]) : '\\stackopen',
        ...group.rows.map((row) => macro('traitrow', row)),
      ].join('\n'),
    )
    .join('\n')
}

// Keys under `special` that other blocks print, or that are not abilities.
const NOT_ABILITY_KEYS = new Set(['feats', 'proficiencies', 'languages'])
// The keys that hold class abilities; every other key is a source of special
// abilities (`racial`, `were-rat-abilities`, `storm-giant`).
const CLASS_ABILITY_KEYS = new Set(['class-abilities', 'class-features'])

/**
 * The Class Abilities rows: `\\traitgroup` headers and `\\traitrow`s. Rows
 * the data groups by class are headed by the class. Proficiencies close the
 * block as a group of their own: most come from a class, though the data
 * does not yet say which.
 */
export function buildClassAbilityRows(
  special: Record<string, unknown>,
  classes: Set<string>,
): string {
  const groups = Object.entries(special)
    .filter(([key]) => CLASS_ABILITY_KEYS.has(key))
    .flatMap(([, value]) => traitGroups('', value, classes))
  if (Array.isArray(special.proficiencies)) {
    groups.push({
      title: 'Proficiencies',
      rows: special.proficiencies.map(formatTrait),
      entries: special.proficiencies,
    })
  }
  return traitRows(groups) || '\\traitnone'
}

/**
 * The Special Abilities rows: every other `special` key (racial traits,
 * qualities, a template's abilities), headed by its name.
 */
export function buildSpecialAbilityRows(
  special: Record<string, unknown>,
  classes: Set<string>,
): string {
  const groups = Object.entries(special)
    .filter(
      ([key]) =>
        !key.startsWith('_') &&
        !NOT_ABILITY_KEYS.has(key) &&
        !CLASS_ABILITY_KEYS.has(key),
    )
    .flatMap(([key, value]) => traitGroups(formatTitleKey(key), value, classes))
  return traitRows(groups) || '\\traitnone'
}

/** The class keys under `levels`, to tell class abilities from the rest. */
export function getClassNames(levels: Record<string, unknown>): Set<string> {
  const ignored = new Set([
    'xp',
    'hd',
    'hp',
    'max-hp',
    'ecl',
    'level-adjustment',
  ])
  return new Set(Object.keys(levels).filter((key) => !ignored.has(key)))
}

// A source's shared settings (`_: {cl: 20, save: cha}`) -> "CL 20, save Cha".
function formatSpellLikeSettings(settings: unknown): string {
  return Object.entries(toRecord(settings))
    .map(([key, value]) => {
      if (key === 'cl') {
        return `CL ${String(value)}`
      }
      if (key === 'save') {
        return `save ${formatTitleKey(String(value))}`
      }
      return `${formatTitleKey(key)} ${formatDetail(value)}`
    })
    .join(', ')
}

// One ability, `[1/day, {dc: [15, {base: 13, cha: 2}]}]` -> "1/day; DC 15".
function formatSpellLike(value: unknown): string {
  const parts = Array.isArray(value) ? value : [value]
  return parts
    .map((part) => {
      if (!isRecord(part)) {
        return formatDetail(part)
      }
      return Object.entries(part)
        .map(([key, detail]) =>
          key === 'dc'
            ? `DC ${String(getArrayFirst(detail))}`
            : `${formatTitleKey(key)} ${formatDetail(detail)}`,
        )
        .join(', ')
    })
    .filter((part) => part)
    .join('; ')
}

/**
 * The Spell-Like Abilities block, after a `\blockrule`: one `\traitgroup` per
 * source, titled with its caster level and save, then a `\traitrow` per
 * ability with its uses and DC. Nothing for a sheet without any.
 */
export function buildSpellLikeBlock(spellLike: unknown): string {
  const groups: TraitGroup[] = Object.entries(toRecord(spellLike))
    .filter(([key]) => !key.startsWith('_'))
    .map(([source, abilities]) => {
      const record = toRecord(abilities)
      const settings = formatSpellLikeSettings(record._)
      const abilityEntries = Object.entries(record).filter(
        ([key]) => !key.startsWith('_'),
      )
      return {
        title: settings
          ? `${formatTitleKey(source)} (${settings})`
          : formatTitleKey(source),
        rows: abilityEntries.map(([name, value]): [string, string] => [
          formatTitleKey(name),
          formatSpellLike(value),
        ]),
        entries: abilityEntries,
      }
    })
  const rows = traitRows(groups)
  if (!rows) {
    return ''
  }
  return [
    '\\blockrule',
    '\\fitblock{\\textheight}{%',
    '\\begin{sheetblock}{Spell-Like Abilities}',
    rows,
    '\\end{sheetblock}}',
  ].join('\n')
}

// Words that mark a feat, trait or item as something to use when attacking.
// The data does not yet say so itself, so this is a guess from the text;
// an effect aimed at `combat.attack` is certain.
const ATTACK_WORDS =
  /\b(?:attacks?|damage|crit(?:ical)?s?|shots?|strike|smite|cleave|charge|rage|blow|finesse|two-weapon fighting|grapple)\b/i

function strings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.flatMap(strings)
  }
  return isRecord(value) ? Object.values(value).flatMap(strings) : []
}

function isAttackOption(entry: unknown, row: [string, string]): boolean {
  return (
    strings(entry).some((text) => text.startsWith('combat.attack')) ||
    ATTACK_WORDS.test(`${row[0]} ${row[1]}`)
  )
}

// An inventory item is `[name, qty, category, weight, price, props?, tags?,
// effects?]`.
function isAttackItem(item: unknown[]): boolean {
  const tail = item.slice(5)
  const tags = tail.find(isStringList) ?? []
  return (
    String(item[2] ?? '').toLowerCase() !== 'weapon' &&
    (tags.includes('combat-offense') ||
      strings(tail.filter(Array.isArray).filter((part) => part !== tags)).some(
        (text) => text.startsWith('combat.attack'),
      ))
  )
}

/**
 * The Attack Options rows: every feat, special trait, class ability and
 * carried item that bears on an attack, grouped by where it comes from.
 * Feats and traits count when an effect targets `combat.attack` or their
 * text is about attacking (see `ATTACK_WORDS`); items when they are tagged
 * `combat-offense` or an effect targets `combat.attack`. Weapons are in their
 * own tables. `\\traitnone` for a sheet with none.
 */
export function buildAttackOptionRows(
  special: Record<string, unknown>,
  classes: Set<string>,
  inventory: Record<string, unknown>,
): string {
  const feats = Array.isArray(special.feats) ? special.feats : []
  const featGroup: TraitGroup = { title: 'Feats', rows: [], entries: [] }
  for (const feat of feats) {
    const [name, effect] = summarizeFeat(feat)
    const row: [string, string] = [name, effect]
    if (isAttackOption(feat, row)) {
      featGroup.rows.push(row)
      featGroup.entries.push(feat)
    }
  }

  const traitGroupsFound = Object.entries(special)
    .filter(([key]) => !key.startsWith('_') && !NOT_ABILITY_KEYS.has(key))
    .flatMap(([key, value]) =>
      traitGroups(
        CLASS_ABILITY_KEYS.has(key) ? 'Class Abilities' : formatTitleKey(key),
        value,
        classes,
      ),
    )
    .map((group) => {
      const kept = group.rows
        .map((row, index) => [row, group.entries[index]] as const)
        .filter(([row, entry]) => isAttackOption(entry, row))
      return {
        title: group.title,
        rows: kept.map(([row]) => row),
        entries: kept.map(([, entry]) => entry),
      }
    })

  const itemGroup: TraitGroup = { title: 'Items', rows: [], entries: [] }
  for (const [key, items] of Object.entries(inventory)) {
    if (key.startsWith('_') || !Array.isArray(items)) {
      continue
    }
    for (const item of items) {
      if (Array.isArray(item) && isAttackItem(item)) {
        const props = item.slice(5).find(isRecord)
        itemGroup.rows.push([String(item[0] ?? ''), formatDetail(props)])
        itemGroup.entries.push(item)
      }
    }
  }

  return traitRows([featGroup, ...traitGroupsFound, itemGroup]) || '\\traitnone'
}
