import { formatTitleKey } from './text'
import {
  extractBreakdown,
  formatSigned,
  formatSources,
  getArrayFirst,
  toRecord,
} from './components'
import { formatDetail, getClassNames, isRecord, macro } from './actionsSummary'
import { escapeLatexText } from './renderTemplate'

// Rows for the parts of a sheet that vary most between characters: a
// block's optional extras (Ben's fly speed, Mike's DR), languages, money,
// ammunition, and the Build page's level and notes rows. Each builder returns template macro
// calls with every cell escaped, for a {{{...}}} token.

// Keys that read badly title-cased.
const SPECIAL_LABELS: Record<string, string> = {
  dr: 'DR',
  'spell-resistance': 'SR',
  'will-vs-mind-affecting': 'Will vs. Mind-Affecting',
}

export interface SpecialRowOptions {
  /** Sign the total, as for a save ("+15"); a speed or SR reads unsigned. */
  signed?: boolean
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * One row per `[key, value]`, for the end of a block. A value with a total
 * (a number, or `[total, {sources}, ...notes]`) is a `\statrow`: Ben's
 * `fly: [150, poor]` shows 150 beside "poor". Text, or a list of it, is a
 * `\noterow` whose text spans the total and sources columns: Mike's
 * `dr: 10/silver`. A note row's first argument is the label column's width,
 * a number, which escaping leaves as it is. What bears on a block without
 * being a value of its own goes under its table instead, as block notes.
 */
export function buildSpecialRows(
  entries: [string, unknown][],
  options: SpecialRowOptions = {},
): string {
  return entries
    .filter(([key, value]) => !key.startsWith('_') && value !== undefined)
    .map(([key, value]) => {
      const label = SPECIAL_LABELS[key] ?? formatTitleKey(key)
      const parts = Array.isArray(value) ? value : [value]
      const [total] = parts
      if (typeof total === 'number') {
        const notes = parts.slice(1).filter(isText)
        const sources = [formatSources(value), notes.join(', ')]
          .filter((part) => part)
          .join('; ')
        const shown = options.signed ? formatSigned(total) : String(total)
        // No icon: the row keeps the room for one, so its label lines up.
        return macro('statrow', ['', label, shown, sources])
      }
      const text = parts
        .map(formatDetail)
        .filter((part) => part)
        .join('; ')
      // Page 1's blocks give their label column 0.30 of the width.
      return macro('noterow', ['0.30', label, text])
    })
    .join('\n')
}

// The saves every character has, which a conditional save builds on.
const BASE_SAVES = ['fortitude', 'reflex', 'will']

/**
 * A block's extra saves, split into the rows of its table and the notes
 * under it. A save is conditional, and a note, when one of its sources is a
 * base save: Andy's `will-vs-mind-affecting: [15, {will: 10, mindarmor: 5},
 * 3/day]` is his Will of 10 and 5 more, so it reads "3/day +5 Will vs.
 * Mind-Affecting (+15 total)", any text leading as when it applies. A save
 * with no base save among its sources has nothing to be a bonus to, so it
 * stays a row.
 */
export function separateConditionalSaves(entries: [string, unknown][]): {
  rows: [string, unknown][]
  notes: string[]
} {
  const rows: [string, unknown][] = []
  const notes: string[] = []
  for (const [key, value] of entries) {
    const parts = Array.isArray(value) ? value : [value]
    const [total] = parts
    const sources = extractBreakdown(value)
    const base = BASE_SAVES.map((save) => sources[save]).find(
      (source): source is number => typeof source === 'number',
    )
    if (
      key.startsWith('_') ||
      typeof total !== 'number' ||
      base === undefined
    ) {
      rows.push([key, value])
      continue
    }
    const label = SPECIAL_LABELS[key] ?? formatTitleKey(key)
    const when = parts.slice(1).filter(isText)
    const bonus = `${formatSigned(total - base)} ${label}`
    notes.push(`${[...when, bonus].join(' ')} (${formatSigned(total)} total)`)
  }
  return { rows, notes }
}

/**
 * Notes as the data writes them, one entry each: a list is one note per
 * entry, and text is split at each semicolon outside parentheses, so
 * "Vanisher Cloak (3 charges/day); Deathward 1/day" is two notes.
 */
export function splitNotes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap(splitNotes)
  }
  const text = formatDetail(value)
  const notes: string[] = []
  let depth = 0
  let start = 0
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (char === '(') {
      depth++
    } else if (char === ')') {
      depth = Math.max(0, depth - 1)
    } else if (char === ';' && depth === 0) {
      notes.push(text.slice(start, index))
      start = index + 1
    }
  }
  notes.push(text.slice(start))
  return notes.map((note) => note.trim()).filter((note) => note)
}

/**
 * A block's notes, set under its table as `\blocknotes{...}` with
 * `\notesep` between them (a small blue diamond, or a bullet on the plain
 * sheet). Each argument is anything `splitNotes` reads. Nothing at all for
 * a block without notes.
 */
export function buildBlockNotes(...values: unknown[]): string {
  const notes = values.flatMap(splitNotes).map(escapeLatexText)
  return notes.length > 0 ? `\\blocknotes{${notes.join('\\notesep ')}}` : ''
}

/**
 * Languages two to a row, as `\langrow{a}{b}`, then any social note as
 * `\textrow{label}{text}`. `\nonerow` for a sheet with neither.
 */
export function buildLanguageRows(
  languages: unknown,
  social?: unknown,
): string {
  const names = (Array.isArray(languages) ? languages : [])
    .map(formatDetail)
    .filter((name) => name)
  const rows: string[] = []
  for (let i = 0; i < names.length; i += 2) {
    rows.push(macro('langrow', [names[i] ?? '', names[i + 1] ?? '']))
  }
  if (social !== undefined) {
    rows.push(macro('textrow', ['Social', formatDetail(social)]))
  }
  return rows.length > 0 ? rows.join('\n') : '\\nonerow{2}'
}

const COINS: [string, string][] = [
  ['pp', 'Platinum'],
  ['gp', 'Gold'],
  ['sp', 'Silver'],
  ['cp', 'Copper'],
]

/**
 * `\moneyrow{label}{amount}{note}` rows. A money entry is `[total, weight,
 * container, {pp, gp, sp, cp}, ...]`: a row per coin the character has, then
 * the entry's total with where it is carried. A sheet with more than one
 * entry heads each with its name and ends with the `_total` of them all.
 * `\nonerow` for a sheet with no money.
 */
export function buildMoneyRows(money: unknown): string {
  const record = toRecord(money)
  const entries = Object.entries(record).filter(
    ([key, value]) => !key.startsWith('_') && Array.isArray(value),
  ) as [string, unknown[]][]
  if (entries.length === 0) {
    return '\\nonerow{3}'
  }
  const several = entries.length > 1
  const rows = entries.flatMap(([key, entry]) => {
    const coins = toRecord(entry.find(isRecord))
    const coinRows = COINS.filter(
      ([coin]) => Number(coins[coin] ?? 0) !== 0,
    ).map(([coin, label]) =>
      macro('moneyrow', [label, String(coins[coin]), '']),
    )
    const where = [entry[1], entry[2]]
      .filter((part) => typeof part === 'string' || typeof part === 'number')
      .map(String)
      .join(', ')
    return [
      ...(several ? [macro('moneygroup', [formatTitleKey(key)])] : []),
      ...coinRows,
      macro('moneyrow', ['Total', String(entry[0] ?? ''), where]),
    ]
  })
  if (several && record._total !== undefined) {
    rows.push(macro('moneyrow', ['All Money', String(record._total), '']))
  }
  return rows.join('\n')
}

// Hit dice as the data writes them: `{d8: 6, d10: 3}` -> "6d8, 3d10", a
// class-keyed record as "Rogue 6", and a bare die size (`[10, 12]`) as "d12".
export function formatHitDice(hd: unknown): string {
  const dice = Array.isArray(hd) ? hd[1] : undefined
  if (typeof dice === 'number') {
    return `d${dice}`
  }
  return Object.entries(toRecord(dice))
    .map(([key, count]) =>
      /^d\d+$/.test(key)
        ? `${String(count)}${key}`
        : `${formatTitleKey(key)} ${String(count)}`,
    )
    .join(', ')
}

/**
 * The effective character level: the sheet's `ecl` when it gives one (a
 * template or level adjustment raises it), otherwise the class levels added
 * up, which for most characters is the same thing.
 */
export function getEcl(levels: Record<string, unknown>): string {
  if (levels.ecl !== undefined) {
    return String(getArrayFirst(levels.ecl))
  }
  const total = [...getClassNames(levels)]
    .map((key) => Number(getArrayFirst(levels[key])))
    .filter(Number.isFinite)
    .reduce((sum, level) => sum + level, 0)
  return total > 0 ? String(total) : ''
}

/**
 * The Build page's Level block: XP, ECL, level adjustment (only when the
 * sheet has it), hit dice, max HP and skill points, each a `\statrow`.
 */
export function buildLevelRows(
  levels: Record<string, unknown>,
  skills: Record<string, unknown>,
): string {
  const rows: string[][] = [
    ['glowing-star', 'XP', String(getArrayFirst(levels.xp)), ''],
    ['chart-increasing', 'ECL', getEcl(levels), ''],
  ]
  if (levels['level-adjustment'] !== undefined) {
    rows.push([
      'heavy-plus-sign',
      'Level Adj.',
      formatSigned(getArrayFirst(levels['level-adjustment'])),
      '',
    ])
  }
  rows.push(
    [
      'game-die',
      'Hit Dice',
      String(getArrayFirst(levels.hd)),
      formatHitDice(levels.hd),
    ],
    [
      'heart-with-ribbon',
      'Max HP',
      String(getArrayFirst(levels['max-hp'])),
      formatSources(levels['max-hp']),
    ],
  )
  if (skills._points !== undefined) {
    rows.push([
      'graduation-cap',
      'Skill Points',
      String(getArrayFirst(skills._points)),
      formatSources(skills._points),
    ])
  }
  return rows.map((row) => macro('statrow', row)).join('\n')
}

/**
 * One `\textrow{label}{note}` per `notes` key. `\nonerow` for a sheet with
 * no notes.
 */
export function buildNoteRows(notes: unknown): string {
  const rows = Object.entries(toRecord(notes))
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) =>
      macro('textrow', [formatTitleKey(key), formatDetail(value)]),
    )
  return rows.length > 0 ? rows.join('\n') : '\\nonerow{2}'
}

/**
 * The inventory items whose category is `ammo`, from every container: an
 * `\ammogroup{container}` row for each container that holds any, then an
 * `\ammorow{name}{qty}` per item in it. The template leaves a column beside
 * them for marking off what is used. `\nonerow` for a sheet with none.
 */
export function buildAmmoRows(inventory: unknown): string {
  const rows = Object.entries(toRecord(inventory))
    .filter(([key, value]) => !key.startsWith('_') && Array.isArray(value))
    .flatMap(([container, items]) => {
      const ammo = (items as unknown[]).filter(
        (item): item is unknown[] =>
          Array.isArray(item) && String(item[2] ?? '').toLowerCase() === 'ammo',
      )
      if (ammo.length === 0) {
        return []
      }
      return [
        macro('ammogroup', [formatTitleKey(container)]),
        ...ammo.map((item) =>
          macro('ammorow', [String(item[0] ?? ''), String(item[1] ?? '')]),
        ),
      ]
    })
  return rows.length > 0 ? rows.join('\n') : '\\nonerow{3}'
}
