import { escapeLatexText } from './renderTemplate'
import { formatTitleKey } from './text'
import {
  extractBreakdown,
  formatSigned,
  formatSignedTotal,
  formatSource,
  getArrayFirst,
  isNonZeroComponent,
  sortComponentEntries,
  toRecord,
} from './components'
import {
  CLASS_ABILITY_KEYS,
  NOT_ABILITY_KEYS,
  collectAttackOptions,
  formatAttackNotes,
  formatDetail,
  formatFullAttackEntry,
  formatSpellLike,
  formatSpellLikeSettings,
  getClassNames,
  getConditionalKeys,
  getWeapons,
  isRecord,
  shortFeat,
  traitGroups,
  type WeaponSummary,
} from './actionsSummary'
import { separateConditionalSaves, splitNotes } from './sheetExtras'
import type { CasterSummary } from './spellSummary'

// The Stat Block sheet: the character as a stat block in the style of
// WotC's later 3.5 books (Drow of the Underdark, Monster Manual V), grouped
// by when a player looks: who and what it is, then Defense, Offense,
// Statistics and Special Abilities. Each builder returns the lines of one
// section as template macros, every bit of text escaped, for a {{{...}}}
// token:
//
// - `\sbline{...}`: one entry, which wraps with a hanging indent.
// - `\sbl{Label}`: a bold label inside a line, "Init" or "Melee".
// - `\sbspell{level}{spells}`: one spell level under a casting line.
// - `\sbability{name}{text}`: a special ability, bold name then its text.
//
// A line the data has nothing for is left out, so a mule's block is a few
// lines and a wizard's runs on.

type Segment = [label: string, text: string]

// `\sbl{Init} +6; \sbl{Senses} darkvision 60ft`: labelled parts of one line,
// those with no text dropped.
function line(...segments: Segment[]): string {
  const parts = segments
    .filter(([, text]) => text)
    .map(([label, text]) =>
      label
        ? `\\sbl{${escapeLatexText(label)}} ${escapeLatexText(text)}`
        : escapeLatexText(text),
    )
  return parts.length > 0 ? `\\sbline{${parts.join('; ')}}` : ''
}

function lines(...entries: string[]): string {
  return entries.filter((entry) => entry).join('\n')
}

function list(value: unknown): string[] {
  return (Array.isArray(value) ? value : [value])
    .map(formatDetail)
    .filter((entry) => entry)
}

// The size abbreviations the data uses, as a stat block spells them out.
const SIZES: Record<string, string> = {
  F: 'Fine',
  D: 'Diminutive',
  T: 'Tiny',
  S: 'Small',
  M: 'Medium',
  L: 'Large',
  H: 'Huge',
  G: 'Gargantuan',
  C: 'Colossal',
}

const SEXES: Record<string, string> = { M: 'Male', F: 'Female' }

// What a description field holds when the data leaves it out.
function described(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

// "Ranger 6/Fighter 3/Rogue 4", in the order `levels` lists them.
function formatClasses(levels: Record<string, unknown>): string {
  return [...getClassNames(levels)]
    .map((key) => {
      const level = getArrayFirst(levels[key])
      return level === ''
        ? formatTitleKey(key)
        : `${formatTitleKey(key)} ${String(level)}`
    })
    .join('/')
}

/**
 * The block's title lines: the name, then who and what the character is
 * ("Male Orc Ranger 6/Fighter 3/Rogue 4", "CG Medium"), then Init, Senses
 * (with Listen and Spot, as a stat block gives them) and Languages.
 */
export function buildStatBlockHeader(character: Record<string, unknown>): {
  identity: string
  lines: string
} {
  const description = toRecord(character.description)
  const levels = toRecord(character.levels)
  const special = toRecord(character.special)
  const skills = toRecord(character.skills)
  const combat = toRecord(character.combat)

  const sex = described(description.sex)
  const template = described(description.template)
  const who = [
    SEXES[sex.toUpperCase()] ?? sex,
    described(description.race),
    template && template !== 'None' ? template : '',
    formatClasses(levels),
  ]
    .filter((part) => part)
    .join(' ')
  const size = described(description.size)
  const what = [
    described(description.alignment),
    SIZES[size.toUpperCase()] ?? size,
  ]
    .filter((part) => part)
    .join(' ')

  const perception = ['listen', 'spot']
    .filter((key) => key in skills)
    .map(
      (key) =>
        `${formatTitleKey(key)} ${formatSigned(getArrayFirst(skills[key]))}`,
    )
    .join(', ')
  const senses = [list(special.senses).join(', '), perception]
    .filter((part) => part)
    .join('; ')

  const identity = [who, what]
    .filter((part) => part)
    .map((part) => `\\sbidentity{${escapeLatexText(part)}}`)
    .join('\n')
  return {
    identity,
    lines: lines(
      line(['Init', formatSignedTotal(combat.initiative)], ['Senses', senses]),
      line(['Languages', list(special.languages).join(', ')]),
      line([
        'Notes',
        splitNotes(toRecord(character['view-notes']).social).join('; '),
      ]),
    ),
  }
}

// A total's sources signed and in order, base and zeros left out: "+6 Dex,
// +9 armor". A stat block puts the bonus before what it is.
function formatModifiers(value: unknown): string {
  return sortComponentEntries(
    Object.entries(extractBreakdown(value)).filter(
      ([key, component]) =>
        !key.startsWith('_') && key !== 'base' && isNonZeroComponent(component),
    ),
  )
    .map(([key, component]) => {
      const [label, ...amount] = formatSource(key, component).split(' ')
      return `${amount.join(' ')} ${label}`
    })
    .join(', ')
}

// Keys of `combat.defense` the AC line prints, or that are not a defense to
// look up at the table (max Dex is for working AC out, not for play).
const AC_KEYS = new Set(['ac', 'touch-ac', 'flat-footed-ac', 'acp', 'max-dex'])

// Defense keys that read badly title-cased.
const DEFENSE_LABELS: Record<string, string> = {
  dr: 'DR',
  'spell-resistance': 'SR',
  sr: 'SR',
}

// An extra defense or speed: `dr: 10/silver`, `spell-resistance: 18`,
// `fly: [150, poor]` as "150 (poor)".
export function formatExtra(value: unknown): string {
  const parts = Array.isArray(value) ? value : [value]
  const [first, ...rest] = parts
  const head = formatDetail(first)
  const detail = rest
    .filter((part) => !isRecord(part))
    .map(formatDetail)
    .filter((part) => part)
  return detail.length > 0 ? `${head} (${detail.join(', ')})` : head
}

/**
 * Defense: AC with touch and flat-footed and what the AC is made of; hp
 * with hit dice, then DR, SR and any other defense the data lists; the
 * saves, with conditional saves after them ("+5 Will vs. Mind-Affecting");
 * and the player's defense notes.
 */
export function buildStatBlockDefense(
  character: Record<string, unknown>,
): string {
  const levels = toRecord(character.levels)
  const combat = toRecord(character.combat)
  const defense = toRecord(combat.defense)
  const saves = toRecord(combat.saves)

  const ac = getArrayFirst(defense.ac)
  const acParts = [
    ac === '' ? '' : String(ac),
    defense['touch-ac'] === undefined
      ? ''
      : `touch ${String(getArrayFirst(defense['touch-ac']))}`,
    defense['flat-footed-ac'] === undefined
      ? ''
      : `flat-footed ${String(getArrayFirst(defense['flat-footed-ac']))}`,
  ].filter((part) => part)
  const acModifiers = formatModifiers(defense.ac)
  const acText = acParts.join(', ') + (acModifiers ? ` (${acModifiers})` : '')

  const hp = getArrayFirst(levels.hp)
  const hd = getArrayFirst(levels.hd)
  const hpText =
    hp === '' ? '' : hd === '' ? String(hp) : `${String(hp)} (${String(hd)} HD)`
  const extras: Segment[] = Object.entries(defense)
    .filter(([key]) => !key.startsWith('_') && !AC_KEYS.has(key))
    .map(([key, value]) => [
      DEFENSE_LABELS[key] ?? formatTitleKey(key),
      formatExtra(value),
    ])

  const others = separateConditionalSaves(
    Object.entries(saves).filter(
      ([key]) => !['fortitude', 'reflex', 'will'].includes(key),
    ),
  )
  const saveSegments: Segment[] = [
    ['Fort', formatSignedTotal(saves.fortitude)],
    ['Ref', formatSignedTotal(saves.reflex)],
    ['Will', formatSignedTotal(saves.will)],
  ]
  const saveLine = saveSegments.filter(([, text]) => text)
  const extraSaves = others.rows
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]): Segment => [formatTitleKey(key), formatExtra(value)])
  const saveText = saveLine
    .map(([label, text]) => `\\sbl{${label}} ${escapeLatexText(text)}`)
    .join(', ')
  const saveNotes = others.notes.map(escapeLatexText).join('; ')

  return lines(
    line(['AC', acText]),
    line(['hp', hpText], ...extras),
    saveText
      ? `\\sbline{${saveText}${saveNotes ? ` (${saveNotes})` : ''}}`
      : '',
    ...extraSaves.map((segment) => line(segment)),
    line([
      'Notes',
      splitNotes(toRecord(character['view-notes'])['combat-defense']).join(
        '; ',
      ),
    ]),
  )
}

// A plain number is a speed in feet. The land speed is given in squares
// too, as stat blocks do: "30 ft. (6 squares)", but "fly 150 ft. (poor)".
export function formatSpeed(value: unknown, inSquares = false): string {
  const speed = getArrayFirst(value)
  if (typeof speed !== 'number') {
    return formatExtra(value)
  }
  const rest = (Array.isArray(value) ? value.slice(1) : [])
    .filter((part) => !isRecord(part))
    .map(formatDetail)
    .filter((part) => part)
  if (inSquares && Number.isInteger(speed / 5)) {
    rest.unshift(`${speed / 5} squares`)
  }
  return `${speed} ft.${rest.length > 0 ? ` (${rest.join(', ')})` : ''}`
}

// Movement keys that are not a mode of movement.
const NOT_SPEED_KEYS = new Set(['speed', 'run', 'load', 'capacity'])

// "x2" is every weapon's crit unless it says otherwise, so it goes unsaid.
// "19-20/x2" is "19-20", and "x3" stays.
export function formatCrit(crit: string): string {
  const text = crit.trim()
  if (!text || /^x2$/i.test(text)) {
    return ''
  }
  return text.replace(/\/x2$/i, '')
}

// "Sickle 1 Solo +20 (1d6+6)", "Bow Of The Wintermoon +19 (1d8+6/x3, 110ft)".
function formatWeapon(weapon: WeaponSummary): string {
  const crit = formatCrit(weapon.crit)
  const damage = [weapon.damage, crit].filter((part) => part).join('/')
  const detail = [damage, weapon.range].filter((part) => part).join(', ')
  return `${weapon.name} ${weapon.attack}${detail ? ` (${detail})` : ''}`
}

// One spell list's entries, a spell listed more than once counted rather
// than repeated: "detect magic (6)".
export function countSpells(spells: string[]): string {
  const counts = new Map<string, number>()
  for (const spell of spells) {
    counts.set(spell, (counts.get(spell) ?? 0) + 1)
  }
  return [...counts]
    .map(([spell, count]) => (count > 1 ? `${spell} (${count})` : spell))
    .join(', ')
}

export function ordinal(level: string): string {
  const number = Number(level)
  if (!Number.isInteger(number)) {
    return level
  }
  if (number === 0) {
    return '0'
  }
  const suffix =
    number % 100 >= 11 && number % 100 <= 13
      ? 'th'
      : (['th', 'st', 'nd', 'rd'][number % 10] ?? 'th')
  return `${number}${suffix}`
}

/**
 * A caster's lines: "Cleric Spells Prepared (CL 12th; Domains Good,
 * Trickery):", then a `\sbspell` per spell level, highest first as a stat
 * block lists them, each with its spells per day and save DC.
 */
function buildCasterLines(caster: CasterSummary): string[] {
  const settings = [
    caster.casterLevel ? `CL ${ordinal(caster.casterLevel)}` : '',
    caster.ability,
    caster.domains ? `domains ${caster.domains}` : '',
  ]
    .filter((part) => part)
    .join('; ')
  const listName =
    caster.listLabel === 'Spells' ? 'Spells' : `Spells ${caster.listLabel}`
  const label = `${caster.name} ${listName}`
  // Spells the data gives no level for (Andy's `ranger: [Jump]`) are one
  // line.
  const [only] = caster.levels
  if (caster.levels.length === 1 && only?.level === '' && !only.perDay) {
    const shown = settings ? `(${settings}) ` : ''
    return [line([label, `${shown}${countSpells(only.spells)}`])]
  }
  const head = `\\sbline{\\sbl{${escapeLatexText(label)}}${settings ? ` (${escapeLatexText(settings)})` : ''}:}`
  const levels = [...caster.levels]
    .filter((level) => level.spells.length > 0 || level.perDay)
    .sort((a, b) => Number(b.level) - Number(a.level))
    .map((level) => {
      const details = [
        level.perDay ? `${level.perDay}/day` : '',
        level.saveDc ? `DC ${level.saveDc}` : '',
      ]
        .filter((part) => part)
        .join(', ')
      const name = level.level === '' ? 'Spells' : ordinal(level.level)
      const label = details ? `${name} (${details})` : name
      return `\\sbspell{${escapeLatexText(label)}}{${escapeLatexText(countSpells(level.spells))}}`
    })
  return [head, ...levels]
}

/**
 * The spell-like abilities of each source: "Spell-Like Abilities (Ranger;
 * CL 6):", then a `\sbspell` per number of uses ("3/day"), its abilities
 * after it with any further detail in parentheses.
 */
export interface SpellLikeSource {
  /** "Ranger; CL 6": the source, then its shared settings. */
  settings: string
  /** Each number of uses ("3/day") with its abilities, in data order. */
  byUses: [string, string[]][]
}

/**
 * Each source of spell-like abilities, its abilities grouped by uses: an
 * ability's first detail is its uses when it reads like one ("3/day", "at
 * will"), and any further detail follows its name in parentheses. Sources
 * with no abilities are left out.
 */
export function groupSpellLike(spellLike: unknown): SpellLikeSource[] {
  return Object.entries(toRecord(spellLike))
    .filter(([key]) => !key.startsWith('_'))
    .flatMap(([source, abilities]) => {
      const record = toRecord(abilities)
      const settings = [
        formatTitleKey(source),
        formatSpellLikeSettings(record._),
      ]
        .filter((part) => part)
        .join('; ')
      const byUses = new Map<string, string[]>()
      for (const [name, value] of Object.entries(record)) {
        if (name.startsWith('_')) {
          continue
        }
        const [uses = '', ...detail] = formatSpellLike(value).split('; ')
        const usesLabel = /^(?:\d+\/\w+|at will|constant)/i.test(uses)
          ? uses
          : ''
        const rest = usesLabel ? detail : [uses, ...detail]
        const shown = rest.filter((part) => part).join('; ')
        const entry = `${formatTitleKey(name).toLowerCase()}${shown ? ` (${shown})` : ''}`
        const key = usesLabel || 'Uses'
        byUses.set(key, [...(byUses.get(key) ?? []), entry])
      }
      return byUses.size === 0 ? [] : [{ settings, byUses: [...byUses] }]
    })
}

function buildSpellLikeLines(spellLike: unknown): string[] {
  return groupSpellLike(spellLike).flatMap(({ settings, byUses }) => [
    `\\sbline{\\sbl{Spell-Like Abilities} (${escapeLatexText(settings)}):}`,
    ...byUses.map(
      ([uses, entries]) =>
        `\\sbspell{${escapeLatexText(uses)}}{${escapeLatexText(entries.join(', '))}}`,
    ),
  ])
}

// Items to reach for in a fight: what is used up or runs on charges.
const COMBAT_GEAR_CATEGORIES = new Set([
  'wand',
  'potion',
  'scroll',
  'staff',
  'rod',
])
const COMBAT_GEAR_TEXT = /\bcharges?\b|\/day\b|\bpotion\b|\bscroll\b|\bwand\b/i

export type Item = unknown[]

// An item tagged `used` is spent, and no longer something the character has.
function isUsedUp(item: Item): boolean {
  return item
    .slice(5)
    .some((part) => Array.isArray(part) && part.includes('used'))
}

function getItems(inventory: Record<string, unknown>, container?: string) {
  return Object.entries(inventory)
    .filter(
      ([key, value]) =>
        !key.startsWith('_') &&
        key !== 'money' &&
        Array.isArray(value) &&
        (container === undefined || key === container),
    )
    .flatMap(([, value]) =>
      (value as unknown[]).filter(
        (entry): entry is Item =>
          Array.isArray(entry) && entry.length > 0 && !isUsedUp(entry),
      ),
    )
}

/**
 * What the character has on them: the containers `_on` lists (Mike's
 * `[equipped, pack]`), or else the `equipped` container, or else every
 * container. A horse's saddlebags are not to hand in a fight.
 */
export function getCarriedItems(inventory: Record<string, unknown>): Item[] {
  const carried = Array.isArray(inventory._on)
    ? inventory._on.map(String)
    : Array.isArray(inventory.equipped)
      ? ['equipped']
      : undefined
  return carried
    ? carried.flatMap((container) => getItems(inventory, container))
    : getItems(inventory)
}

export function isCombatGear(item: Item): boolean {
  const category = String(item[2] ?? '').toLowerCase()
  return (
    category !== 'weapon' &&
    category !== 'armor' &&
    category !== 'container' &&
    (COMBAT_GEAR_CATEGORIES.has(category) ||
      COMBAT_GEAR_TEXT.test(String(item[0] ?? '')))
  )
}

// "Arrows (31)", or just the name for one of a thing. A name with a colon
// in it reads as a record (`USED: Diamond dust`), so it is read back as text.
export function formatItem(item: Item): string {
  const name = formatDetail(item[0])
  const qty = Number(item[1] ?? 1)
  return Number.isFinite(qty) && qty !== 1 ? `${name} (${qty})` : name
}

/**
 * The special attacks, each as `[name, text]`: every entry of
 * `combat.special-attacks` ("Line Of Force 4d8 (60ft line, ...)") and
 * anything else under `combat.attack` ("Sneak Attack +2d6").
 */
export function getSpecialAttacks(
  character: Record<string, unknown>,
): [string, string][] {
  const combat = toRecord(character.combat)
  const attack = toRecord(combat.attack)
  const listed = Object.entries(toRecord(combat['special-attacks']))
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]): [string, string] => {
      const [total, ...detail] = Array.isArray(value) ? value : [value]
      const [head, ...rest] = [
        formatDetail(total),
        ...detail.map(formatDetail),
      ].filter((part) => part)
      const name = formatTitleKey(key)
      const shown = `${name}${head ? ` ${head}` : ''}`
      return [name, rest.length > 0 ? `${shown} (${rest.join(', ')})` : shown]
    })
  const notes = formatAttackNotes(attack).map((text): [string, string] => [
    text,
    text,
  ])
  return [...listed, ...notes]
}

// The feats and abilities to choose from when attacking, by name, as the
// detailed sheet's Attack Options find them. Items on that list print as
// combat gear instead.
export function getAttackOptionNames(
  character: Record<string, unknown>,
): string[] {
  const names = collectAttackOptions(
    toRecord(character.special),
    getClassNames(toRecord(character.levels)),
    toRecord(character.inventory),
    getConditionalKeys(character.conditionals),
  )
    .filter((group) => group.title !== 'Items')
    .flatMap((group) => group.rows.map(([name]) => name))
  return [...new Set(names)]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Offense: speed in feet and squares with every other mode of movement;
 * each melee and ranged weapon, "or" between them, as one attack; the full
 * attack routines; Base Atk and Grp; special attacks; the attack options
 * (feats and abilities to choose when attacking); combat gear; then the
 * spells and spell-like abilities.
 */
export function buildStatBlockOffense(
  character: Record<string, unknown>,
  casters: CasterSummary[],
): string {
  const combat = toRecord(character.combat)
  const attack = toRecord(combat.attack)
  const movement = toRecord(character.movement)

  const speeds = [
    movement.speed === undefined ? '' : formatSpeed(movement.speed, true),
    ...Object.entries(movement)
      .filter(([key]) => !key.startsWith('_') && !NOT_SPEED_KEYS.has(key))
      .map(([key, value]) => `${key} ${formatSpeed(value)}`),
  ].filter((part) => part)
  const run = getArrayFirst(movement.run)
  const movementNotes = splitNotes(toRecord(character['view-notes']).movement)

  const melee = getWeapons(attack.melee).map(formatWeapon)
  const ranged = getWeapons(attack.ranged).map(formatWeapon)

  const fullAttacks: Segment[] = Object.entries(
    toRecord(attack['full-attack']),
  ).map(([name, routine]) => [
    `Full Attack (${formatTitleKey(name)})`,
    formatDetail(routine),
  ])
  for (const [group, label] of [
    ['melee', 'Full Attack (Melee)'],
    ['ranged', 'Full Attack (Ranged)'],
  ] as const) {
    const routine = toRecord(attack[group])['full-attack']
    if (Array.isArray(routine)) {
      fullAttacks.push([label, routine.map(formatFullAttackEntry).join(', ')])
    } else if (routine !== undefined) {
      fullAttacks.push([label, formatDetail(routine)])
    }
  }

  const bab =
    typeof attack['full-bab'] === 'string'
      ? attack['full-bab']
      : formatSignedTotal(attack.bab)

  const specialAttacks = getSpecialAttacks(character).map(([, text]) => text)
  const options = getAttackOptionNames(character)
  const gear = getCarriedItems(toRecord(character.inventory))
    .filter(isCombatGear)
    .map(formatItem)

  return lines(
    line(
      ['Speed', speeds.join(', ')],
      ['Run', run === '' ? '' : `${String(run)} ft.`],
    ),
    line(['Notes', movementNotes.join('; ')]),
    line(['Melee', melee.join(' or ')]),
    line(['Ranged', ranged.join(' or ')]),
    ...fullAttacks.map((segment) => line(segment)),
    line(['Base Atk', bab], ['Grp', formatSignedTotal(attack.grapple)]),
    line(['Special Atk', specialAttacks.join(', ')]),
    line(['Atk Options', options.join(', ')]),
    line(['Combat Gear', gear.join(', ')]),
    line([
      'Notes',
      splitNotes(toRecord(character['view-notes'])['combat-offense']).join(
        '; ',
      ),
    ]),
    ...casters.flatMap(buildCasterLines),
    ...buildSpellLikeLines(character['spell-like-abilities']),
  )
}

const ABILITIES: [string, string][] = [
  ['strength', 'Str'],
  ['dexterity', 'Dex'],
  ['constitution', 'Con'],
  ['intelligence', 'Int'],
  ['wisdom', 'Wis'],
  ['charisma', 'Cha'],
]

// Ability score sources that are not a skill's own: a skill whose only
// sources are its ability (and an armor check penalty of 0) is untrained,
// and a stat block leaves it out.
const ABILITY_KEYS = new Set(['str', 'dex', 'con', 'int', 'wis', 'cha', 'acp'])

export interface NotableSkill {
  key: string
  total: number
  /** What the data notes beside the total ("favored-enemy: +4"). */
  notes: string[]
}

/**
 * The skills a stat block lists: those with ranks or another bonus beyond the
 * ability's, and any the data adds a note to ("Survival +13 (favored-enemy:
 * +4)"). A skill that cannot be used untrained (`.nan`) is left out.
 */
export function getNotableSkills(
  skills: Record<string, unknown>,
): NotableSkill[] {
  return Object.entries(skills)
    .filter(([key]) => !key.startsWith('_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .flatMap(([key, value]) => {
      const total = getArrayFirst(value)
      if (typeof total !== 'number' || Number.isNaN(total)) {
        return []
      }
      const sources = Object.entries(extractBreakdown(value)).filter(
        ([source, amount]) =>
          !source.startsWith('_') &&
          !ABILITY_KEYS.has(source) &&
          isNonZeroComponent(amount),
      )
      const notes = (Array.isArray(value) ? value.slice(1) : [])
        .filter((part) => typeof part === 'string')
        .map(String)
      return sources.length === 0 && notes.length === 0
        ? []
        : [{ key, total, notes }]
    })
}

function formatStatBlockSkills(skills: Record<string, unknown>): string {
  return getNotableSkills(skills)
    .map(({ key, total, notes }) => {
      const name = `${formatTitleKey(key)} ${formatSigned(total)}`
      return notes.length > 0 ? `${name} (${notes.join('; ')})` : name
    })
    .join(', ')
}

/**
 * The special qualities: every racial trait, class ability and other
 * special, condensed as the Build page has them, except what Offense
 * already names: "Favored Enemy (Humans, Giants)" is an Atk Option, "Sneak
 * Attack +2d6" a special attack.
 */
export function getQualities(character: Record<string, unknown>): string[] {
  const special = toRecord(character.special)
  const classes = getClassNames(toRecord(character.levels))
  const qualities = Object.entries(special)
    .filter(([key]) => !key.startsWith('_') && !NOT_ABILITY_KEYS.has(key))
    .flatMap(([key, value]) =>
      traitGroups(
        CLASS_ABILITY_KEYS.has(key) ? '' : formatTitleKey(key),
        value,
        classes,
      ),
    )
    .flatMap((group) => group.short)
    .filter((entry) => entry)
  const offense = [
    ...getAttackOptionNames(character),
    ...getSpecialAttacks(character).map(([name]) => name),
  ]
    .map(slugify)
    .filter((slug) => slug)
  return qualities.filter((quality) => {
    const slug = slugify(quality)
    return !offense.some((name) => slug === name || slug.startsWith(`${name}-`))
  })
}

/**
 * Statistics: the six scores; the special qualities, every racial trait,
 * class ability and other special the Atk Options do not already name; the
 * feats; the trained skills; what the character carries on them; and load.
 */
export function buildStatBlockStatistics(
  character: Record<string, unknown>,
): string {
  const abilities = toRecord(character.abilities)
  const special = toRecord(character.special)
  const inventory = toRecord(character.inventory)
  const movement = toRecord(character.movement)
  const capacity = toRecord(movement.capacity)
  const classes = getClassNames(toRecord(character.levels))

  const scores = ABILITIES.filter(([key]) => key in abilities)
    .map(([key, label]) => {
      const score = getArrayFirst(abilities[key])
      return `${label} ${score === '' ? '—' : String(score)}`
    })
    .join(', ')

  const shownQualities = getQualities(character)

  const feats = (Array.isArray(special.feats) ? special.feats : [])
    .map(shortFeat)
    .filter((feat) => feat)

  // As a stat block has it: "combat gear plus" the rest, the combat gear
  // being under Offense.
  const items = getCarriedItems(inventory)
  const hasGear = items.some(isCombatGear)
  const possessions = items
    .filter((item) => !isCombatGear(item))
    .map(formatItem)
  const money = getArrayFirst(toRecord(inventory.money)._total)
  if (money !== '') {
    possessions.push(String(money))
  }

  const load = getArrayFirst(movement.load)
  const light = getArrayFirst(capacity.light)
  const loadText = [
    load === '' ? '' : String(load),
    light === '' ? '' : `light up to ${String(light)}`,
  ]
    .filter((part) => part)
    .join('; ')

  return lines(
    line(['Abilities', scores]),
    line(['SQ', shownQualities.join(', ')]),
    line(['Feats', feats.join(', ')]),
    line(['Skills', formatStatBlockSkills(toRecord(character.skills))]),
    line([
      'Possessions',
      `${hasGear ? 'combat gear plus ' : ''}${possessions.join(', ')}`,
    ]),
    line(['Load', loadText]),
  )
}

/**
 * Special Abilities: each of the sheet's conditionals, bold name then what
 * it does and when, the details a stat block saves for its end.
 */
export function buildStatBlockSpecial(character: Record<string, unknown>) {
  return Object.entries(toRecord(character.conditionals))
    .filter(([key]) => !key.startsWith('_'))
    .map(
      ([key, value]) =>
        `\\sbability{${escapeLatexText(formatTitleKey(key))}}{${escapeLatexText(formatDetail(value))}}`,
    )
    .join('\n')
}
