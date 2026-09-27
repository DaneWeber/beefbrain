import * as yaml from 'js-yaml'
import {
  updateCalculatedFields,
  validateBeefBrainData,
  type BeefBrainData,
} from 'bnb-core'
import { LatexGenerationError } from './errors'
import { DEFAULT_TEMPLATE_KEY, getTemplateRecord } from './templates/registry'
import { renderTemplate, escapeLatexText } from './renderTemplate'
import { getSkillIcon } from './skillIcons'
import type {
  LatexFieldMap,
  RenderLatexInput,
  RenderLatexResult,
} from './types'

const DEFAULT_MAX_YAML_BYTES = 256 * 1024
const DEFAULT_MAX_TEMPLATE_BYTES = 256 * 1024

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

function getArrayFirst(value: unknown): string | number {
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

function getFirstRecordValue(record: unknown): string | number {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    return ''
  }
  const values = Object.values(record as Record<string, unknown>)
  if (values.length === 0) {
    return ''
  }
  const first = values[0]
  if (typeof first === 'string' || typeof first === 'number') {
    return first
  }
  return ''
}

function getCharacterLevel(levels: Record<string, unknown>): string | number {
  const hdValue = levels.hd
  const hd = getArrayFirst(hdValue)
  if (typeof hd === 'number' || (typeof hd === 'string' && hd !== '')) {
    return hd
  }
  return ''
}

function toRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return {}
}

function formatTitleKey(key: string): string {
  return key
    .split('-')
    .map((part) => {
      if (part.length === 0) {
        return part
      }
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}

function formatSigned(value: unknown): string {
  if (typeof value === 'number' && Number.isNaN(value)) {
    return NOT_APPLICABLE
  }
  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric >= 0 ? `+${numeric}` : String(numeric)
  }
  return String(value)
}

function formatComponentKey(key: string): string {
  return COMPONENT_LABELS[key] ?? formatTitleKey(key)
}

function formatEffects(value: unknown): string {
  const record = toRecord(value)
  const entries = Object.entries(record)
  if (entries.length === 0) {
    return ''
  }
  return entries
    .map(([key, val]) => `${formatComponentKey(key)}=${String(val)}`)
    .join(', ')
}

function extractBreakdown(value: unknown): Record<string, unknown> {
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

function sortComponentEntries(
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

function formatBreakdown(value: unknown): string {
  const entries = sortComponentEntries(
    Object.entries(extractBreakdown(value)).filter(
      ([key]) => !key.startsWith('_'),
    ),
  )
  if (entries.length === 0) {
    return 'none'
  }

  return entries
    .map(([key, componentValue]) => {
      return `${formatComponentKey(key)} ${formatSigned(componentValue)}`
    })
    .join(', ')
}

// A `base` component is the value the others adjust (AC 10, speed 30, an
// ability's rolled score), so it reads unsigned: "Base 10, Armor +5".
function formatSource(key: string, value: unknown): string {
  const shown = key === 'base' ? String(value) : formatSigned(value)
  return `${formatComponentKey(key)} ${shown}`
}

/**
 * The named sources of a value, as the detailed sheet lists them beside a
 * total: the same component order and labels as formatBreakdown, but zero
 * components are dropped (HP's `damage: 0`) and nothing is shown when no
 * source is left, matching the skills table.
 */
function formatSources(value: unknown): string {
  return sortComponentEntries(
    Object.entries(extractBreakdown(value)).filter(
      ([key, componentValue]) =>
        !key.startsWith('_') && isNonZeroComponent(componentValue),
    ),
  )
    .map(([key, componentValue]) => formatSource(key, componentValue))
    .join(', ')
}

// An ability's modifier, signed like every other bonus on the sheet ("+4").
// Ability data is `[score, {mod}, ...]`.
function formatAbilityMod(value: unknown): string {
  const mod = getFirstRecordValue(Array.isArray(value) ? value[1] : undefined)
  return mod === '' ? '' : formatSigned(mod)
}

/**
 * What an ability score is built from. Ability data is
 * `[score, {mod}, {sources}?]`, and index 1 is the modifier, not a source, so
 * only the records after it count, in the order the data lists them.
 */
function formatAbilitySources(value: unknown): string {
  if (!Array.isArray(value)) {
    return ''
  }
  const sources: Record<string, unknown> = {}
  for (const item of value.slice(2)) {
    Object.assign(sources, toRecord(item))
  }
  return Object.entries(sources)
    .filter(
      ([key, sourceValue]) =>
        !key.startsWith('_') &&
        (key === 'base' || isNonZeroComponent(sourceValue)),
    )
    .map(([key, sourceValue]) => formatSource(key, sourceValue))
    .join(', ')
}

function formatSkillComponent(
  key: string,
  value: unknown,
  includeRankSources: boolean,
): string {
  if (key === 'ranks' && Array.isArray(value)) {
    const rankTotal = value[0]
    const rankSources = toRecord(value[1])
    const rankText = `${formatComponentKey(key)} ${formatSigned(rankTotal)}`
    if (!includeRankSources || Object.keys(rankSources).length === 0) {
      return rankText
    }
    const rankSourceText = Object.entries(rankSources)
      .map(([source, points]) => `${formatTitleKey(source)} ${points}`)
      .join(', ')
    return `${rankText} (${rankSourceText})`
  }

  return `${formatComponentKey(key)} ${formatSigned(value)}`
}

function formatSkills(
  skills: Record<string, unknown>,
  includeRankSources: boolean,
): string {
  const rows = Object.entries(skills)
    .filter(([key]) => !key.startsWith('_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([skillName, skillValue]) => {
      const total = formatSigned(getArrayFirst(skillValue))
      const components = sortComponentEntries(
        Object.entries(extractBreakdown(skillValue)).filter(
          ([component]) => !component.startsWith('_'),
        ),
      )
      const componentText =
        components.length === 0
          ? ''
          : ` (${components
              .map(([component, componentValue]) =>
                formatSkillComponent(
                  component,
                  componentValue,
                  includeRankSources,
                ),
              )
              .join(', ')})`

      return `${formatTitleKey(skillName)} ${total}${componentText}`
    })

  return rows.length > 0 ? rows.join('; ') : 'None listed'
}

function isNonZeroComponent(value: unknown): boolean {
  const numeric = Array.isArray(value) ? value[0] : value
  return Number(numeric) !== 0
}

/**
 * Builds one `\skillrow` call per skill (alphabetical): emoji name (empty
 * when the skill has none, see skillIcons.ts), display name, final bonus
 * (post-ACP), pre-ACP bonus, and only the non-zero named sources of the
 * bonus. Cell text is escaped individually; the macro call itself is left raw
 * for a {{{...}}} template token.
 *
 * A macro rather than a bare `&`-separated row so the template owns the row
 * markup (the detailed sheet adds a strut to hold rows to one line). Templates
 * using this field define `\skillrow`.
 */
function buildSkillsTableRows(skills: Record<string, unknown>): string {
  return Object.entries(skills)
    .filter(([key]) => !key.startsWith('_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([skillName, skillValue]) => {
      // No `|| 0` fallback: a NaN total has to survive to formatSigned so it
      // renders as an em-dash rather than a bonus the character does not have.
      const total = Number(getArrayFirst(skillValue))
      const breakdown = extractBreakdown(skillValue)
      const acp = breakdown.acp
      const preAcp = total - (typeof acp === 'number' ? acp : 0)

      const sources = sortComponentEntries(
        Object.entries(breakdown).filter(
          ([key, value]) =>
            !key.startsWith('_') && key !== 'acp' && isNonZeroComponent(value),
        ),
      )
        // Rank sources (which class bought the ranks) are a level deeper than
        // this table shows: the sheet lists "Ranks +15", not the wizard levels
        // behind it.
        .map(([key, value]) => formatSkillComponent(key, value, false))
        .join(', ')

      // The icon is a CLDR emoji name from our own table, never user text, so
      // it goes in unescaped.
      const icon = getSkillIcon(skillName)
      const name = escapeLatexText(formatTitleKey(skillName))
      const sourcesCell = escapeLatexText(sources)
      return `\\skillrow{${icon}}{${name}}{${formatSigned(total)}}{${formatSigned(preAcp)}}{${sourcesCell}}`
    })
    .join('\n')
}

// The twelve magic item body slots, head to toe, as a printed sheet reads.
const BODY_SLOTS = [
  'head',
  'face',
  'throat',
  'shoulders',
  'body',
  'torso',
  'arms',
  'hands',
  'left-ring',
  'right-ring',
  'waist',
  'feet',
]

// `<name>-slot` tags as written in the data, singular or plural, to the slot
// they occupy.
const SLOT_TAGS: Record<string, string> = {
  head: 'head',
  face: 'face',
  throat: 'throat',
  neck: 'throat',
  shoulder: 'shoulders',
  shoulders: 'shoulders',
  body: 'body',
  torso: 'torso',
  arm: 'arms',
  arms: 'arms',
  hand: 'hands',
  hands: 'hands',
  'left-ring': 'left-ring',
  'right-ring': 'right-ring',
  belt: 'waist',
  waist: 'waist',
  foot: 'feet',
  feet: 'feet',
}

type InventoryItem = unknown[]

function getContainers(
  inventory: Record<string, unknown>,
): Array<[string, InventoryItem[]]> {
  return Object.entries(inventory)
    .filter(
      ([key, value]) =>
        !key.startsWith('_') && key !== 'money' && Array.isArray(value),
    )
    .map(([key, value]) => [
      key,
      (value as unknown[]).filter(
        (entry): entry is InventoryItem =>
          Array.isArray(entry) && entry.length > 0,
      ),
    ])
}

// An item is [name, qty, category, weight, cost, props?, tags?, ...], and the
// data often leaves out props, which moves tags up to index 5. So both are
// found by shape from index 5 on: props is the first plain object, tags the
// first array of strings (a later array may hold effect targets).
function getItemProps(item: InventoryItem): Record<string, unknown> {
  const props = item
    .slice(5)
    .find(
      (entry) => entry && typeof entry === 'object' && !Array.isArray(entry),
    )
  return toRecord(props)
}

function getItemTags(item: InventoryItem): string[] {
  const tags = item
    .slice(5)
    .find(
      (entry): entry is unknown[] =>
        Array.isArray(entry) && entry.every((tag) => typeof tag === 'string'),
    )
  return tags ? tags.map((tag) => String(tag).toLowerCase()) : []
}

/** Per-item weight in pounds from strings like "4 lbs" or "0.1 lb". */
function parseWeight(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return value
  }
  const match = /^\s*(\d+(?:\.\d+)?)/.exec(String(value ?? ''))
  return match ? Number(match[1]) : undefined
}

function formatPounds(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/**
 * One `\invcontainer` header per container, then one `\invitem` per item:
 * name, quantity, and the line's total weight (quantity x per-item weight).
 * Containers the character is not carrying (absent from `_on`, e.g. a horse)
 * are marked, since their weight does not count toward load. Templates using
 * this field define `\invcontainer` and `\invitem`.
 */
function buildInventoryTableRows(inventory: Record<string, unknown>): string {
  const carried = Array.isArray(inventory._on)
    ? inventory._on.map(String)
    : undefined

  return getContainers(inventory)
    .map(([container, items]) => {
      let subtotal = 0
      const rows = items.map((item) => {
        const qty = Number(item[1] ?? 1)
        const each = parseWeight(item[3])
        const weight = each === undefined ? undefined : each * qty
        subtotal += weight ?? 0
        const name = escapeLatexText(String(item[0] ?? 'Unknown item'))
        const weightCell = weight === undefined ? '' : formatPounds(weight)
        return `\\invitem{${name}}{${Number.isFinite(qty) ? qty : ''}}{${weightCell}}`
      })

      const notCarried =
        carried !== undefined && !carried.includes(container)
          ? ' (not carried)'
          : ''
      const label = escapeLatexText(`${formatTitleKey(container)}${notCarried}`)
      return [
        `\\invcontainer{${label}}{${formatPounds(subtotal)}}`,
        ...rows,
      ].join('\n')
    })
    .join('\n')
}

function formatSlotItem(item: InventoryItem): string {
  const name = escapeLatexText(String(item[0] ?? 'Unknown item'))
  const effects = escapeLatexText(formatEffects(getItemProps(item)))
  return `\\slotitem{${name}}{${effects}}`
}

/**
 * One `\slotrow` per body slot (head to toe): label, whether the slot is
 * over-filled (1 or 0), and the items in it. Then one `\slotlessrow` per
 * slotless magic item: label ("Slotless" on the first) and the item.
 * Only the `equipped` container counts; a spare belt in the pack occupies no
 * slot. Templates using this field define `\slotrow`, `\slotlessrow` and
 * `\slotitem`.
 */
function buildSlotsTableRows(inventory: Record<string, unknown>): string {
  const equipped = getContainers(inventory).find(
    ([container]) => container === 'equipped',
  )?.[1]
  const bySlot = new Map<string, InventoryItem[]>(
    BODY_SLOTS.map((slot) => [slot, []]),
  )
  const slotless: InventoryItem[] = []

  for (const item of equipped ?? []) {
    for (const tag of getItemTags(item)) {
      if (tag === 'other-slot') {
        slotless.push(item)
        continue
      }
      const slot = tag.endsWith('-slot')
        ? SLOT_TAGS[tag.slice(0, -'-slot'.length)]
        : undefined
      if (slot) {
        bySlot.get(slot)?.push(item)
      }
    }
  }

  const slotRows = BODY_SLOTS.map((slot) => {
    const items = bySlot.get(slot) ?? []
    const conflict = items.length > 1 ? 1 : 0
    return `\\slotrow{${formatTitleKey(slot)}}{${conflict}}{${items.map(formatSlotItem).join('\\newline ')}}`
  })
  const slotlessRows = slotless.map(
    (item, index) =>
      `\\slotlessrow{${index === 0 ? 'Slotless' : ''}}{${formatSlotItem(item)}}`,
  )
  return [...slotRows, ...slotlessRows].join('\n')
}

function hasMagicIndicators(
  name: string,
  effects: Record<string, unknown>,
  tags: unknown,
): boolean {
  if (Object.keys(effects).length > 0) {
    return true
  }

  if (name.includes('+')) {
    return true
  }

  if (!Array.isArray(tags)) {
    return false
  }

  const loweredTags = tags
    .map((item) => String(item).toLowerCase())
    .filter((item) => item.length > 0)
  return loweredTags.some((tag) =>
    ['magic', 'wondrous', 'ring', 'staff', 'rod', 'wand'].includes(tag),
  )
}

function formatEquippedMagicItems(inventory: Record<string, unknown>): string {
  const equipped = inventory.equipped
  if (!Array.isArray(equipped)) {
    return 'None listed'
  }

  const items = equipped
    .filter((entry): entry is unknown[] => Array.isArray(entry))
    .map((entry) => {
      const name = String(entry[0] ?? 'Unknown item')
      const quantity = entry[1]
      const effects = toRecord(entry[5])
      const tags = entry[entry.length - 1]
      return {
        name,
        quantity: String(quantity ?? 1),
        effects,
        tags,
      }
    })
    .filter((item) => hasMagicIndicators(item.name, item.effects, item.tags))
    .map((item) => {
      const effectsText = formatEffects(item.effects)
      if (effectsText.length > 0) {
        return `${item.name} (qty ${item.quantity}; effects: ${effectsText})`
      }
      return `${item.name} (qty ${item.quantity})`
    })

  return items.length > 0 ? items.join('; ') : 'None listed'
}

function formatItemsByContainer(inventory: Record<string, unknown>): string {
  const entries = Object.entries(inventory).filter(
    ([key, value]) =>
      !key.startsWith('_') && key !== 'money' && Array.isArray(value),
  )
  if (entries.length === 0) {
    return 'None listed'
  }

  return entries
    .map(([container, value]) => {
      const items = Array.isArray(value) ? value : []
      const summarized = items
        .filter((entry): entry is unknown[] => Array.isArray(entry))
        .map((entry) => {
          const name = String(entry[0] ?? 'Unknown item')
          const qty = Number(entry[1] ?? 1)
          return qty > 1 ? `${name} x${qty}` : name
        })
      const itemText = summarized.length > 0 ? summarized.join(', ') : 'None'
      return `${formatTitleKey(container)}: ${itemText}`
    })
    .join('; ')
}

function formatSpellsSummary(spellsValue: unknown): string {
  const spells = toRecord(spellsValue)
  const classes = Object.entries(spells).filter(
    ([key, value]) =>
      !key.startsWith('_') && value && typeof value === 'object',
  )
  if (classes.length === 0) {
    return 'No spellcasting data'
  }

  return classes
    .map(([className, classData]) => {
      const classRecord = toRecord(classData)
      const casting = Array.isArray(classRecord.casting)
        ? classRecord.casting
        : []
      const castingMode = casting.length > 0 ? String(casting[0]) : 'unknown'
      const castingAbility =
        casting.length > 1 ? String(casting[1]).toUpperCase() : 'N/A'
      const domains = Array.isArray(classRecord.domains)
        ? classRecord.domains.map((entry) => String(entry)).join(', ')
        : ''
      const domainText = domains.length > 0 ? `; domains ${domains}` : ''
      return `${formatTitleKey(className)}: ${castingMode} via ${castingAbility}${domainText}`
    })
    .join(' | ')
}

function formatSpellSlotsSummary(spellsValue: unknown): string {
  const spells = toRecord(spellsValue)
  const classes = Object.entries(spells).filter(
    ([key, value]) =>
      !key.startsWith('_') && value && typeof value === 'object',
  )
  if (classes.length === 0) {
    return 'No spell slot data'
  }

  return classes
    .map(([className, classData]) => {
      const slots = toRecord(toRecord(classData).slots)
      const levels = Object.keys(slots).sort((a, b) => Number(a) - Number(b))
      if (levels.length === 0) {
        return `${formatTitleKey(className)}: no slots listed`
      }

      const slotText = levels
        .map((level) => `${level}:${String(getArrayFirst(slots[level]))}`)
        .join(', ')
      return `${formatTitleKey(className)} slots ${slotText}`
    })
    .join(' | ')
}

function formatPreparedSpellsSummary(spellsValue: unknown): string {
  const spells = toRecord(spellsValue)
  const classes = Object.entries(spells).filter(
    ([key, value]) =>
      !key.startsWith('_') && value && typeof value === 'object',
  )
  if (classes.length === 0) {
    return 'No prepared spell data'
  }

  return classes
    .map(([className, classData]) => {
      const prepared = toRecord(toRecord(classData).prepared)
      const levels = Object.keys(prepared).sort((a, b) => Number(a) - Number(b))
      if (levels.length === 0) {
        return `${formatTitleKey(className)}: no prepared list`
      }
      const preparedByLevel = levels
        .map((level) => {
          const spellsAtLevel = Array.isArray(prepared[level])
            ? (prepared[level] as unknown[])
                .map((entry) => String(entry))
                .join(', ')
            : String(prepared[level])
          return `${level}[${spellsAtLevel}]`
        })
        .join('; ')
      return `${formatTitleKey(className)} prepared ${preparedByLevel}`
    })
    .join(' | ')
}

function getClassSummary(characterData: Record<string, unknown>): string {
  const levels = characterData.levels
  if (!levels || typeof levels !== 'object' || Array.isArray(levels)) {
    return 'Unknown'
  }

  const ignored = new Set([
    'xp',
    'hd',
    'hp',
    'max-hp',
    'ecl',
    'level-adjustment',
  ])
  const classPairs: string[] = []

  for (const [key, value] of Object.entries(levels)) {
    if (ignored.has(key)) {
      continue
    }
    const classLevel = getArrayFirst(value)
    classPairs.push(`${key} ${classLevel}`)
  }

  return classPairs.length > 0 ? classPairs.join(' / ') : 'Unknown'
}

function buildFieldMap(data: BeefBrainData): LatexFieldMap {
  const characterData =
    ((data.character ?? {}) as Record<string, unknown>) || {}
  const description = (characterData.description ?? {}) as Record<
    string,
    unknown
  >
  const abilities = (characterData.abilities ?? {}) as Record<string, unknown>
  const combat = (characterData.combat ?? {}) as Record<string, unknown>
  const defense = (combat.defense ?? {}) as Record<string, unknown>
  const movement = (characterData.movement ?? {}) as Record<string, unknown>
  const savesContainer = (combat.saves ?? {}) as Record<string, unknown>
  const hpContainer = (characterData.levels ?? {}) as Record<string, unknown>
  const skillsContainer = toRecord(characterData.skills)
  const inventoryContainer = toRecord(characterData.inventory)
  const spellsContainer = toRecord(characterData.spells)

  return {
    'character.name': String(description.name ?? 'Unknown'),
    'character.player': String(description.player ?? 'Unknown'),
    'character.race': String(description.race ?? 'Unknown'),
    'character.alignment': String(description.alignment ?? 'Unknown'),
    'character.size': String(description.size ?? 'Unknown'),
    'character.sex': String(description.sex ?? 'Unknown'),
    'character.age': String(description.age ?? 'Unknown'),
    'character.height': String(description.height ?? 'Unknown'),
    'character.weight': String(description.weight ?? 'Unknown'),
    'character.eyes': String(description.eyes ?? 'Unknown'),
    'character.hair': String(description.hair ?? 'Unknown'),
    'character.complexion': String(description.complexion ?? 'Unknown'),
    'character.build': String(description.build ?? 'Unknown'),
    'character.classes': getClassSummary(characterData),
    'character.level': getCharacterLevel(hpContainer),

    'abilities.strength.score': getArrayFirst(abilities.strength),
    'abilities.strength.sources': formatAbilitySources(abilities.strength),
    'abilities.strength.mod': formatAbilityMod(abilities.strength),
    'abilities.dexterity.score': getArrayFirst(abilities.dexterity),
    'abilities.dexterity.sources': formatAbilitySources(abilities.dexterity),
    'abilities.dexterity.mod': formatAbilityMod(abilities.dexterity),
    'abilities.constitution.score': getArrayFirst(abilities.constitution),
    'abilities.constitution.sources': formatAbilitySources(
      abilities.constitution,
    ),
    'abilities.constitution.mod': formatAbilityMod(abilities.constitution),
    'abilities.intelligence.score': getArrayFirst(abilities.intelligence),
    'abilities.intelligence.sources': formatAbilitySources(
      abilities.intelligence,
    ),
    'abilities.intelligence.mod': formatAbilityMod(abilities.intelligence),
    'abilities.wisdom.score': getArrayFirst(abilities.wisdom),
    'abilities.wisdom.sources': formatAbilitySources(abilities.wisdom),
    'abilities.wisdom.mod': formatAbilityMod(abilities.wisdom),
    'abilities.charisma.score': getArrayFirst(abilities.charisma),
    'abilities.charisma.sources': formatAbilitySources(abilities.charisma),
    'abilities.charisma.mod': formatAbilityMod(abilities.charisma),

    'combat.hp': getArrayFirst(hpContainer.hp),
    'combat.hp.breakdown': formatBreakdown(hpContainer.hp),
    'combat.hp.sources': formatSources(hpContainer.hp),
    'combat.ac': getArrayFirst(defense.ac),
    'combat.ac.breakdown': formatBreakdown(defense.ac),
    'combat.ac.sources': formatSources(defense.ac),
    'combat.touchAc': getArrayFirst(defense['touch-ac']),
    'combat.touchAc.breakdown': formatBreakdown(defense['touch-ac']),
    'combat.touchAc.sources': formatSources(defense['touch-ac']),
    'combat.flatFootedAc': getArrayFirst(defense['flat-footed-ac']),
    'combat.flatFootedAc.breakdown': formatBreakdown(defense['flat-footed-ac']),
    'combat.flatFootedAc.sources': formatSources(defense['flat-footed-ac']),
    'combat.acp': getArrayFirst(defense.acp),
    'combat.acp.breakdown': formatBreakdown(defense.acp),
    'combat.acp.sources': formatSources(defense.acp),
    'combat.maxDex': getArrayFirst(defense['max-dex']),
    'combat.initiative': getArrayFirst(combat.initiative),
    'combat.initiative.breakdown': formatBreakdown(combat.initiative),
    'combat.initiative.sources': formatSources(combat.initiative),
    'combat.defenseSpecial': String(defense.special ?? 'None'),

    'saves.fortitude': getArrayFirst(savesContainer.fortitude),
    'saves.fortitude.breakdown': formatBreakdown(savesContainer.fortitude),
    'saves.fortitude.sources': formatSources(savesContainer.fortitude),
    'saves.reflex': getArrayFirst(savesContainer.reflex),
    'saves.reflex.breakdown': formatBreakdown(savesContainer.reflex),
    'saves.reflex.sources': formatSources(savesContainer.reflex),
    'saves.will': getArrayFirst(savesContainer.will),
    'saves.will.breakdown': formatBreakdown(savesContainer.will),
    'saves.will.sources': formatSources(savesContainer.will),

    'movement.speed': getArrayFirst(movement.speed),
    'movement.speed.breakdown': formatBreakdown(movement.speed),
    'movement.speed.sources': formatSources(movement.speed),
    'movement.run': getArrayFirst(movement.run),
    'movement.load': getArrayFirst(movement.load),
    'movement.capacity': formatEffects(movement.capacity),

    'skills.summary': formatSkills(skillsContainer, false),
    'skills.summaryDetailed': formatSkills(skillsContainer, true),
    'skills.detailedTable': buildSkillsTableRows(skillsContainer),

    'inventory.equippedMagicItems':
      formatEquippedMagicItems(inventoryContainer),
    'inventory.itemsByContainer': formatItemsByContainer(inventoryContainer),
    'inventory.detailedTable': buildInventoryTableRows(inventoryContainer),
    'inventory.slotsTable': buildSlotsTableRows(inventoryContainer),

    'spells.summary': formatSpellsSummary(spellsContainer),
    'spells.slotsSummary': formatSpellSlotsSummary(spellsContainer),
    'spells.preparedSummary': formatPreparedSpellsSummary(spellsContainer),
  }
}

export function renderLatex(input: RenderLatexInput): RenderLatexResult {
  const maxYamlBytes = input.maxYamlBytes ?? DEFAULT_MAX_YAML_BYTES
  const maxTemplateBytes = input.maxTemplateBytes ?? DEFAULT_MAX_TEMPLATE_BYTES

  if (Buffer.byteLength(input.yaml, 'utf-8') > maxYamlBytes) {
    throw new LatexGenerationError(
      'INPUT_TOO_LARGE',
      `YAML input exceeds ${maxYamlBytes} bytes.`,
    )
  }

  if (input.templateContent) {
    if (Buffer.byteLength(input.templateContent, 'utf-8') > maxTemplateBytes) {
      throw new LatexGenerationError(
        'INPUT_TOO_LARGE',
        `Template input exceeds ${maxTemplateBytes} bytes.`,
      )
    }
  }

  if (!validateBeefBrainData(input.yaml)) {
    throw new LatexGenerationError(
      'INVALID_YAML',
      'Input is not valid BeefBrain YAML.',
    )
  }

  const templateKey = input.templateKey ?? DEFAULT_TEMPLATE_KEY
  const templateRecord = getTemplateRecord(templateKey)
  if (!templateRecord) {
    throw new LatexGenerationError(
      'UNKNOWN_TEMPLATE',
      `Template "${templateKey}" was not found.`,
    )
  }

  const templateToRender = input.templateContent ?? templateRecord.template
  const calculatedYaml = updateCalculatedFields(input.yaml)
  const parsedData = yaml.load(calculatedYaml) as BeefBrainData
  const fields = buildFieldMap(parsedData)

  return {
    latex: renderTemplate(templateToRender, fields),
    template: templateRecord.info,
  }
}
