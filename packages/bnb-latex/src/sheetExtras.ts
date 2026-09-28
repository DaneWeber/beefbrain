import { formatTitleKey } from './text'
import {
  formatSigned,
  formatSources,
  getArrayFirst,
  toRecord,
} from './components'
import { formatDetail, isRecord, macro } from './actionsSummary'

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
  /**
   * The label column's share of the block's width, which a note row's text
   * spans past. Page 1's blocks use 0.30.
   */
  labelWidth?: string
}

function isText(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * One row per `[key, value]`, for the end of a block. A value with a total
 * (a number, or `[total, {sources}, ...notes]`) is a `\statrow`: Andy's
 * `will-vs-mind-affecting: [15, {will: 10, mindarmor: 5}, 3/day]` shows +15
 * beside "Mindarmor +5, Will +10; 3/day". Text, or a list of it, is a
 * `\noterow` whose text spans the total and sources columns: Mike's
 * `dr: 10/silver`. A note row's first argument is the label column's width,
 * a number, which escaping leaves as it is. A `notes` entry has no label and
 * is a `\fullnoterow` across the whole row.
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
      // A block's notes need no label: the text takes the whole row.
      if (key === 'notes') {
        return macro('fullnoterow', [text])
      }
      const width = options.labelWidth ?? '0.30'
      return macro('noterow', [width, label, text])
    })
    .join('\n')
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
 * The Build page's Level block: XP, ECL and level adjustment (each only when
 * the sheet has it), hit dice, max HP and skill points, each a `\statrow`.
 */
export function buildLevelRows(
  levels: Record<string, unknown>,
  skills: Record<string, unknown>,
): string {
  const rows: string[][] = [
    ['glowing-star', 'XP', String(getArrayFirst(levels.xp)), ''],
  ]
  if (levels.ecl !== undefined) {
    rows.push([
      'chart-increasing',
      'ECL',
      String(getArrayFirst(levels.ecl)),
      '',
    ])
  }
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
 * One `\ammorow{name}{qty}{container}` per inventory item whose category is
 * `ammo`, from every container. The template leaves a column beside them
 * for marking off what is used. `\nonerow` for a sheet with none.
 */
export function buildAmmoRows(inventory: unknown): string {
  const rows = Object.entries(toRecord(inventory))
    .filter(([key, value]) => !key.startsWith('_') && Array.isArray(value))
    .flatMap(([container, items]) =>
      (items as unknown[])
        .filter(
          (item): item is unknown[] =>
            Array.isArray(item) &&
            String(item[2] ?? '').toLowerCase() === 'ammo',
        )
        .map((item) =>
          macro('ammorow', [
            String(item[0] ?? ''),
            String(item[1] ?? ''),
            formatTitleKey(container),
          ]),
        ),
    )
  return rows.length > 0 ? rows.join('\n') : '\\nonerow{4}'
}
