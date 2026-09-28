import { getSpellSaveDc, parseCastingProfile } from 'bnb-core'
import { escapeLatexText } from './renderTemplate'
import { formatTitleKey } from './text'

/**
 * One spellcasting class, read from either shape a sheet's `spells` block
 * comes in:
 *
 * - Calculated: class-keyed, `ranger: {casting: [divine, prepared, wis],
 *   caster-level: 3, slots: {"1": [2, {...}]}, prepared: {"1": [...]}}`.
 * - Hand-entered: `caster-class: wizard` with `key-ability`, `spells-per-day`,
 *   `save-dc` and `spells-prepared` or `spells-known`, either at the top of
 *   `spells` or under a class key.
 *
 * A bare list under a class key (`ranger: [Jump]`) is read as spells of
 * unknown level.
 */
export interface CasterSummary {
  name: string
  /** e.g. "Divine, prepared"; '' when the sheet does not say. */
  casting: string
  /** e.g. "Wis"; '' when the sheet does not say. */
  ability: string
  casterLevel: string
  domains: string
  /** What the per-level spell lists are: "Prepared", "Known" or "Spells". */
  listLabel: string
  levels: SpellLevelSummary[]
}

export interface SpellLevelSummary {
  /** The spell level, or '' for spells listed without one. */
  level: string
  perDay: string
  saveDc: string
  spells: string[]
}

const ABILITY_LABELS: Record<string, string> = {
  str: 'Str',
  strength: 'Str',
  dex: 'Dex',
  dexterity: 'Dex',
  con: 'Con',
  constitution: 'Con',
  int: 'Int',
  intelligence: 'Int',
  wis: 'Wis',
  wisdom: 'Wis',
  cha: 'Cha',
  charisma: 'Cha',
}

// The keys a hand-entered sheet puts directly under `spells`.
const FLAT_SECTION_KEYS = ['caster-class', 'caster-level', 'spells-per-day']

// Where each shape keeps its per-level lists, with the list's name.
const LIST_KEYS: [string, string][] = [
  ['prepared', 'Prepared'],
  ['spells-prepared', 'Prepared'],
  ['known', 'Known'],
  ['spells-known', 'Known'],
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function asText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 0 ? asText(value[0]) : ''
  }
  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : ''
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/**
 * One entry of a spell list. Most are plain names. A record marks the spell:
 * `{cast: Lightfoot}` is a prepared spell already cast, and a domain slot is
 * `{sun-domain: endure elements}`.
 */
export function formatSpellEntry(entry: unknown): string {
  if (Array.isArray(entry)) {
    return entry.map(formatSpellEntry).join(', ')
  }
  if (isRecord(entry)) {
    return Object.entries(entry)
      .map(([key, value]) =>
        key === 'cast'
          ? `${formatSpellEntry(value)} (cast)`
          : `${formatSpellEntry(value)} (${formatTitleKey(key)})`,
      )
      .join(', ')
  }
  return entry === null || entry === undefined ? '' : String(entry)
}

function spellList(value: unknown): string[] {
  const entries = Array.isArray(value) ? value : [value]
  return entries.map(formatSpellEntry).filter((entry) => entry.length > 0)
}

function summarizeSection(
  key: string,
  section: Record<string, unknown>,
  character: unknown,
): CasterSummary {
  const profile = parseCastingProfile(section.casting)
  const listEntry = LIST_KEYS.find(([listKey]) => isRecord(section[listKey]))
  const lists = listEntry
    ? (section[listEntry[0]] as Record<string, unknown>)
    : {}
  // A hand-entered sheet names no casting mode, but its list says it.
  const mode =
    profile?.mode ??
    (listEntry?.[1] === 'Known'
      ? 'spontaneous'
      : listEntry?.[1] === 'Prepared'
        ? 'prepared'
        : '')
  const casting = capitalize(
    [profile?.tradition, mode].filter((part) => part).join(', '),
  )
  const abilityKey = profile?.ability ?? asText(section['key-ability'])
  const perDay = isRecord(section.slots)
    ? section.slots
    : isRecord(section['spells-per-day'])
      ? section['spells-per-day']
      : {}
  const saveDc = isRecord(section['save-dc']) ? section['save-dc'] : {}

  const levels = [
    ...new Set([
      ...Object.keys(perDay),
      ...Object.keys(saveDc),
      ...Object.keys(lists),
    ]),
  ]
    .filter((level) => !level.startsWith('_'))
    .sort((a, b) => Number(a) - Number(b))
    .map((level) => ({
      level,
      perDay: asText(perDay[level]),
      saveDc: asText(saveDc[level]) || computeSaveDc(character, key, level),
      spells: level in lists ? spellList(lists[level]) : [],
    }))

  const domains = Array.isArray(section.domains)
    ? section.domains.map(String).join(', ')
    : asText(section.domains)

  return {
    name: formatTitleKey(asText(section['caster-class']) || key),
    casting,
    ability: ABILITY_LABELS[abilityKey.toLowerCase()] ?? capitalize(abilityKey),
    casterLevel: asText(section['caster-level']),
    domains,
    listLabel: listEntry?.[1] ?? 'Spells',
    levels,
  }
}

// A calculated sheet lists no save DCs, but its casting profile gives one.
function computeSaveDc(
  character: unknown,
  caster: string,
  level: string,
): string {
  try {
    return String(getSpellSaveDc(character, caster, Number(level)).total)
  } catch {
    return ''
  }
}

/** Every spellcasting class on the sheet, in the order the sheet lists them. */
export function summarizeSpellcasting(character: unknown): CasterSummary[] {
  const spells = isRecord(character) ? character.spells : undefined
  if (!isRecord(spells)) {
    return []
  }
  if (FLAT_SECTION_KEYS.some((key) => key in spells)) {
    return [summarizeSection('spells', spells, character)]
  }
  return Object.entries(spells).flatMap(([key, value]) => {
    if (key.startsWith('_') || key === 'special-spells') {
      return []
    }
    if (isRecord(value)) {
      return [summarizeSection(key, value, character)]
    }
    if (Array.isArray(value)) {
      return [
        {
          name: formatTitleKey(key),
          casting: '',
          ability: '',
          casterLevel: '',
          domains: '',
          listLabel: 'Spells',
          levels: [
            { level: '', perDay: '', saveDc: '', spells: spellList(value) },
          ],
        },
      ]
    }
    return []
  })
}

/** One `\castingrow` per class, or `\castingnone` for a sheet with none. */
export function buildCastingTableRows(casters: CasterSummary[]): string {
  if (casters.length === 0) {
    return '\\castingnone'
  }
  return casters
    .map((caster) => {
      const cells = [
        caster.name,
        caster.casting,
        caster.ability,
        caster.casterLevel,
        caster.domains,
      ].map(escapeLatexText)
      return `\\castingrow{${cells.join('}{')}}`
    })
    .join('\n')
}

/**
 * A `spelllevels` block per class, its rows one spell level each, each after
 * a `\blockrule` that parts it from the casting table or the class before.
 */
export function buildSpellLevelBlocks(casters: CasterSummary[]): string {
  return casters
    .filter((caster) => caster.levels.length > 0)
    .map((caster) => {
      const rows = caster.levels.map((level) => {
        const cells = [
          level.level,
          level.perDay,
          level.saveDc,
          level.spells.join(', '),
        ].map(escapeLatexText)
        return `\\spelllevelrow{${cells.join('}{')}}`
      })
      return [
        '\\blockrule',
        `\\begin{spelllevels}{${escapeLatexText(caster.name)}}{${caster.listLabel}}`,
        ...rows,
        '\\end{spelllevels}',
      ].join('\n')
    })
    .join('\n')
}
