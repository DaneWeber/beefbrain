// The "total plus named sources" grammar every calculated value on a sheet
// shares: `[total, {source: value, ...}]`, printed as the total beside its
// sources ("+7" beside "Str +2, Ranks +5").
import { formatTitleKey } from './text'

// `.nan` in the YAML (e.g. `handle-animal: [.nan, {no-training: .nan}]`) means
// the character cannot attempt the roll at all, which is different from a +0
// bonus. Both the total and the component render as an em-dash.
const NOT_APPLICABLE = '\u2014'

const COMPONENT_LABELS: Record<string, string> = {
  str: 'Str',
  dex: 'Dex',
  con: 'Con',
  int: 'Int',
  wis: 'Wis',
  cha: 'Cha',
  ranks: 'Ranks',
  feat: 'Feat',
  feats: 'Feats',
  acp: 'ACP',
  bab: 'BAB',
  base: 'Base',
  'max-hp': 'Max HP',
  class: 'Class',
  racial: 'Racial',
  armor: 'Armor',
  shield: 'Shield',
  misc: 'Misc',
}

const COMPONENT_SORT_ORDER = [
  'str',
  'dex',
  'con',
  'int',
  'wis',
  'cha',
  'ranks',
  'class',
  'racial',
  'feat',
  'feats',
  'bab',
  'base',
  'armor',
  'shield',
  'acp',
  'misc',
]

export function getArrayFirst(value: unknown): string | number {
  if (Array.isArray(value) && value.length > 0) {
    const first = value[0]
    if (typeof first === 'string' || typeof first === 'number') {
      return first
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return value
  }
  return ''
}

export function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

export function formatSigned(value: unknown): string {
  if (typeof value === 'number' && Number.isNaN(value)) {
    return NOT_APPLICABLE
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric >= 0 ? `+${numeric}` : String(numeric)
  }
  return String(value)
}

export function formatComponentKey(key: string): string {
  return COMPONENT_LABELS[key] ?? formatTitleKey(key)
}

export function extractBreakdown(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }

  if (!Array.isArray(value)) {
    return {}
  }

  const combined: Record<string, unknown> = {}
  for (let i = 1; i < value.length; i++) {
    const item = value[i]
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      Object.assign(combined, item)
    }
  }
  return combined
}

export function sortComponentEntries(
  entries: [string, unknown][],
): [string, unknown][] {
  const rank = new Map(COMPONENT_SORT_ORDER.map((key, index) => [key, index]))
  return entries.sort(([a], [b]) => {
    const aRank = rank.has(a)
      ? (rank.get(a) as number)
      : Number.MAX_SAFE_INTEGER
    const bRank = rank.has(b)
      ? (rank.get(b) as number)
      : Number.MAX_SAFE_INTEGER
    if (aRank !== bRank) {
      return aRank - bRank
    }
    return a.localeCompare(b)
  })
}

// A `base` component is the value the others adjust (AC 10, speed 30, an
// ability's rolled score), so it reads unsigned: "Base 10, Armor +5".
export function formatSource(key: string, value: unknown): string {
  const shown = key === 'base' ? String(value) : formatSigned(value)
  return `${formatComponentKey(key)} ${shown}`
}

/**
 * The named sources of a value, as the detailed sheet lists them beside a
 * total: the same component order and labels as formatBreakdown, but zero
 * components are dropped (HP's `damage: 0`) and nothing is shown when no
 * source is left, matching the skills table.
 */
export function formatSources(value: unknown): string {
  return sortComponentEntries(
    Object.entries(extractBreakdown(value)).filter(
      ([key, componentValue]) =>
        !key.startsWith('_') && isNonZeroComponent(componentValue),
    ),
  )
    .map(([key, componentValue]) => formatSource(key, componentValue))
    .join(', ')
}

// A total that is itself a bonus (a save), signed like its sources ("+0",
// "-1"). A missing value stays blank rather than reading as "+0".
export function formatSignedTotal(value: unknown): string {
  const total = getArrayFirst(value)
  return total === '' ? '' : formatSigned(total)
}

export function isNonZeroComponent(value: unknown): boolean {
  const numeric = Array.isArray(value) ? value[0] : value
  return Number(numeric) !== 0
}
