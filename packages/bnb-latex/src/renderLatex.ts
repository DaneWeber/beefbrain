import * as yaml from 'js-yaml'
import {
  summarizeItemEffects,
  updateCalculatedFields,
  validateBeefBrainData,
  type BeefBrainData,
} from 'bnb-core'
import { LatexGenerationError } from './errors'
import { DEFAULT_TEMPLATE_KEY, getTemplateRecord } from './templates/registry'
import { renderTemplate, escapeLatexText } from './renderTemplate'
import { getSkillIcon } from './skillIcons'
import { formatTitleKey } from './text'
import { BNB_LATEX_VERSION } from './version'
import {
  extractBreakdown,
  formatComponentKey,
  formatSigned,
  formatSignedTotal,
  formatSource,
  formatSources,
  getArrayFirst,
  isNonZeroComponent,
  sortComponentEntries,
  toRecord,
} from './components'
import {
  buildAttackOptionRows,
  buildAbilitySummaryRows,
  buildConditionalsBlock,
  buildFullAttackBlock,
  buildMeleeRows,
  buildRangedRows,
  buildSpecialAttackRows,
  buildSpellLikeBlock,
  formatAttackNotes,
  getClassNames,
  getConditionalKeys,
} from './actionsSummary'
import {
  buildAmmoRows,
  buildAwarenessRows,
  buildBlockNotes,
  buildLevelRows,
  buildMoneyRows,
  buildNoteRows,
  buildSpecialRows,
  formatHitDice,
  separateConditionalSaves,
} from './sheetExtras'
import {
  buildQuickConditionalsBlock,
  buildQuickDefenseRows,
  buildQuickFullAttackBlock,
  buildQuickMovementRows,
  buildQuickOptionsBlock,
  buildQuickSaves,
  buildQuickSkillRows,
  buildQuickSpellBlocks,
  buildQuickSpellLikeBlock,
  buildQuickWeaponRows,
} from './quickSheet'
import {
  buildStatBlockDefense,
  buildStatBlockHeader,
  buildStatBlockOffense,
  buildStatBlockSpecial,
  buildStatBlockStatistics,
} from './statBlock'
import {
  buildCastingTableRows,
  buildSpellLevelBlocks,
  summarizeSpellcasting,
  type CasterSummary,
} from './spellSummary'
import type {
  LatexFieldMap,
  RenderLatexInput,
  RenderLatexResult,
} from './types'

const DEFAULT_MAX_YAML_BYTES = 256 * 1024
const DEFAULT_MAX_TEMPLATE_BYTES = 256 * 1024

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
  const rows = Object.entries(skills)
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
  // The armor check penalty opens the list, alphabetically where it falls
  // anyway: its own bonus, nothing to take it out of, and what it comes from.
  // A character with none has no row for it.
  const acp = Number(getArrayFirst(skills._acp))
  if (Number.isFinite(acp) && acp !== 0) {
    const sources = escapeLatexText(formatSources(skills._acp))
    rows.unshift(`\\skillrow{anchor}{ACP}{${formatSigned(acp)}}{}{${sources}}`)
  }
  return rows.join('\n')
}

// The day a sheet was made, as YYYY-MM-DD in local time.
function formatDate(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

// The twelve magic item body slots, head to toe, as a printed sheet reads,
// each with the CLDR emoji name the sheet shows beside it.
const BODY_SLOT_ICONS: Record<string, string> = {
  head: 'military-helmet',
  face: 'goggles',
  throat: 'prayer-beads',
  shoulders: 'coat',
  body: 'kimono',
  torso: 't-shirt',
  arms: 'mechanical-arm',
  hands: 'gloves',
  'left-ring': 'ring',
  'right-ring': 'ring',
  waist: 'scarf',
  feet: 'hiking-boot',
}
const BODY_SLOTS = Object.keys(BODY_SLOT_ICONS)

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

/** Item props plus a summary of its effect bonuses, for display. */
function formatItemEffects(item: InventoryItem): string {
  return [formatEffects(getItemProps(item)), ...summarizeItemEffects(item)]
    .filter((part) => part.length > 0)
    .join(', ')
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

// Only the item's name: its effects are on page 1 and the item list.
function formatSlotItem(item: InventoryItem): string {
  const name = escapeLatexText(String(item[0] ?? 'Unknown item'))
  return `\\slotitem{${name}}`
}

/**
 * One `\slotrow` per body slot (head to toe): icon, label, whether the slot
 * is over-filled (1 or 0), and the items in it. Then one `\slotlessrow` per
 * slotless magic item: label ("Slotless" on each) and the item.
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
    return `\\slotrow{${BODY_SLOT_ICONS[slot]}}{${formatTitleKey(slot)}}{${conflict}}{${items.map(formatSlotItem).join('\\newline ')}}`
  })
  const slotlessRows = slotless.map(
    (item) => `\\slotlessrow{Slotless}{${formatSlotItem(item)}}`,
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
      const effects = getItemProps(entry)
      const tags = getItemTags(entry)
      return {
        name,
        quantity: String(quantity ?? 1),
        effects,
        tags,
        effectsText: formatItemEffects(entry),
      }
    })
    .filter(
      (item) =>
        item.effectsText.length > 0 ||
        hasMagicIndicators(item.name, item.effects, item.tags),
    )
    .map((item) => {
      const { effectsText } = item
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

function formatSpellsSummary(casters: CasterSummary[]): string {
  if (casters.length === 0) {
    return 'No spellcasting data'
  }
  return casters
    .map((caster) => {
      const profile = [
        caster.casting,
        caster.ability,
        caster.casterLevel && `caster level ${caster.casterLevel}`,
        caster.domains && `domains ${caster.domains}`,
      ].filter((part) => part)
      return `${caster.name}: ${profile.length > 0 ? profile.join('; ') : 'unknown'}`
    })
    .join(' | ')
}

function formatSpellSlotsSummary(casters: CasterSummary[]): string {
  if (casters.length === 0) {
    return 'No spell slot data'
  }
  return casters
    .map((caster) => {
      const slots = caster.levels.filter((level) => level.perDay)
      if (slots.length === 0) {
        return `${caster.name}: no slots listed`
      }
      const slotText = slots
        .map((level) => `${level.level}:${level.perDay}`)
        .join(', ')
      return `${caster.name} slots ${slotText}`
    })
    .join(' | ')
}

function formatPreparedSpellsSummary(casters: CasterSummary[]): string {
  if (casters.length === 0) {
    return 'No prepared spell data'
  }
  return casters
    .map((caster) => {
      const lists = caster.levels.filter((level) => level.spells.length > 0)
      if (lists.length === 0) {
        return `${caster.name}: no ${caster.listLabel.toLowerCase()} list`
      }
      const byLevel = lists
        .map((level) => `${level.level}[${level.spells.join(', ')}]`)
        .join('; ')
      return `${caster.name} ${caster.listLabel.toLowerCase()} ${byLevel}`
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

function buildFieldMap(data: BeefBrainData, generatedAt: Date): LatexFieldMap {
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
  const capacity = toRecord(movement.capacity)
  const savesContainer = (combat.saves ?? {}) as Record<string, unknown>
  const hpContainer = (characterData.levels ?? {}) as Record<string, unknown>
  const skillsContainer = toRecord(characterData.skills)
  const inventoryContainer = toRecord(characterData.inventory)
  const casters = summarizeSpellcasting(characterData)
  const attack = toRecord(combat.attack)
  const special = toRecord(characterData.special)
  const classes = getClassNames(hpContainer)
  const viewNotes = toRecord(characterData['view-notes'])
  // A block's fixed rows are printed by the template; every other key in it
  // gets an optional row after them.
  const extraEntries = (
    record: Record<string, unknown>,
    fixed: string[],
  ): [string, unknown][] =>
    Object.entries(record).filter(([key]) => !fixed.includes(key))
  const statBlockHeader = buildStatBlockHeader(characterData)
  const quickSaves = buildQuickSaves(characterData)
  const extraSaves = separateConditionalSaves(
    extraEntries(savesContainer, ['fortitude', 'reflex', 'will']),
  )

  return {
    'sheet.generated': `bnb-latex ${BNB_LATEX_VERSION}, ${formatDate(generatedAt)}`,
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
    'character.template': String(description.template ?? 'None'),
    'character.awarenessTable': buildAwarenessRows(
      special.languages,
      special.senses,
    ),
    // What bears on talking or noticing but is not a language or a sense:
    // Mike's empathy with rats, a telepathy.
    'character.awarenessNotes': buildBlockNotes(viewNotes.social),
    'build.levelRows': buildLevelRows(hpContainer, skillsContainer),
    'build.noteRows': buildNoteRows(characterData.notes),
    'build.abilitiesTable': buildAbilitySummaryRows(special, hpContainer),
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
    'combat.hd': getArrayFirst(hpContainer.hd),
    'combat.hd.sources': formatHitDice(hpContainer.hd),
    'combat.ac': getArrayFirst(defense.ac),
    'combat.ac.breakdown': formatBreakdown(defense.ac),
    'combat.ac.sources': formatSources(defense.ac),
    'combat.touchAc': getArrayFirst(defense['touch-ac']),
    'combat.touchAc.breakdown': formatBreakdown(defense['touch-ac']),
    'combat.touchAc.sources': formatSources(defense['touch-ac']),
    'combat.flatFootedAc': getArrayFirst(defense['flat-footed-ac']),
    'combat.flatFootedAc.breakdown': formatBreakdown(defense['flat-footed-ac']),
    'combat.flatFootedAc.sources': formatSources(defense['flat-footed-ac']),
    'combat.acp': getArrayFirst(skillsContainer._acp),
    'combat.acp.breakdown': formatBreakdown(skillsContainer._acp),
    'combat.acp.sources': formatSources(skillsContainer._acp),
    'combat.maxDex': getArrayFirst(defense['max-dex']),
    'combat.maxDex.sources': formatSources(defense['max-dex']),
    'combat.initiative': formatSignedTotal(combat.initiative),
    'combat.initiative.breakdown': formatBreakdown(combat.initiative),
    'combat.initiative.sources': formatSources(combat.initiative),
    'combat.defenseSpecialRows': buildSpecialRows([
      ...extraEntries(defense, [
        'ac',
        'touch-ac',
        'flat-footed-ac',
        'acp',
        'max-dex',
      ]),
    ]),
    'combat.defenseNotes': buildBlockNotes(viewNotes['combat-defense']),

    // The written-out iteratives (+12/+7/+2) when the sheet has them.
    'combat.bab':
      typeof attack['full-bab'] === 'string'
        ? attack['full-bab']
        : formatSignedTotal(attack.bab),
    'combat.bab.sources': formatSources(attack.bab),
    'combat.melee': formatSignedTotal(toRecord(attack.melee)._),
    'combat.melee.sources': formatSources(toRecord(attack.melee)._),
    'combat.ranged': formatSignedTotal(toRecord(attack.ranged)._),
    'combat.ranged.sources': formatSources(toRecord(attack.ranged)._),
    'combat.grapple': formatSignedTotal(attack.grapple),
    'combat.grapple.sources': formatSources(attack.grapple),

    'actions.meleeTable': buildMeleeRows(attack),
    'actions.rangedTable': buildRangedRows(attack),
    'actions.fullAttackBlock': buildFullAttackBlock(attack),
    'actions.specialAttackRows': buildSpecialAttackRows(combat),
    'actions.attackNotes': buildBlockNotes(
      formatAttackNotes(attack),
      viewNotes['combat-offense'],
    ),
    'actions.spellLikeBlock': buildSpellLikeBlock(
      characterData['spell-like-abilities'],
    ),
    'actions.ammoTable': buildAmmoRows(inventoryContainer),
    'actions.attackOptionsTable': buildAttackOptionRows(
      special,
      classes,
      inventoryContainer,
      getConditionalKeys(characterData.conditionals),
    ),
    'actions.conditionalsBlock': buildConditionalsBlock(
      characterData.conditionals,
    ),

    'saves.specialRows': buildSpecialRows(extraSaves.rows, { signed: true }),
    'saves.notes': buildBlockNotes(extraSaves.notes),
    'saves.fortitude': formatSignedTotal(savesContainer.fortitude),
    'saves.fortitude.breakdown': formatBreakdown(savesContainer.fortitude),
    'saves.fortitude.sources': formatSources(savesContainer.fortitude),
    'saves.reflex': formatSignedTotal(savesContainer.reflex),
    'saves.reflex.breakdown': formatBreakdown(savesContainer.reflex),
    'saves.reflex.sources': formatSources(savesContainer.reflex),
    'saves.will': formatSignedTotal(savesContainer.will),
    'saves.will.breakdown': formatBreakdown(savesContainer.will),
    'saves.will.sources': formatSources(savesContainer.will),

    'movement.specialRows': buildSpecialRows(
      extraEntries(movement, ['speed', 'run', 'load', 'capacity']),
    ),
    'movement.notes': buildBlockNotes(viewNotes.movement),
    'movement.speed': getArrayFirst(movement.speed),
    'movement.speed.breakdown': formatBreakdown(movement.speed),
    'movement.speed.sources': formatSources(movement.speed),
    'movement.run': getArrayFirst(movement.run),
    'movement.run.sources': formatSources(movement.run),
    'movement.load': getArrayFirst(movement.load),
    'movement.capacity': formatEffects(movement.capacity),
    'movement.capacity.light': getArrayFirst(capacity.light),
    'movement.capacity.medium': getArrayFirst(capacity.medium),
    'movement.capacity.heavy': getArrayFirst(capacity.heavy),
    'movement.capacity.lift': getArrayFirst(capacity.lift),
    'movement.capacity.drag': getArrayFirst(capacity.drag),

    'skills.summary': formatSkills(skillsContainer, false),
    'skills.summaryDetailed': formatSkills(skillsContainer, true),
    'skills.detailedTable': buildSkillsTableRows(skillsContainer),

    'inventory.equippedMagicItems':
      formatEquippedMagicItems(inventoryContainer),
    'inventory.itemsByContainer': formatItemsByContainer(inventoryContainer),
    'inventory.detailedTable': buildInventoryTableRows(inventoryContainer),
    'inventory.moneyTable': buildMoneyRows(inventoryContainer.money),
    'inventory.slotsTable': buildSlotsTableRows(inventoryContainer),

    'spells.summary': formatSpellsSummary(casters),
    'spells.slotsSummary': formatSpellSlotsSummary(casters),
    'spells.preparedSummary': formatPreparedSpellsSummary(casters),
    'spells.castingTable': buildCastingTableRows(casters),
    'spells.levelBlocks': buildSpellLevelBlocks(casters),

    'quickRef.saveRows': quickSaves.rows,
    'quickRef.saveNotes': buildBlockNotes(quickSaves.notes),
    'quickRef.defenseRows': buildQuickDefenseRows(characterData),
    'quickRef.movementRows': buildQuickMovementRows(characterData),
    'quickRef.attackNotes': buildBlockNotes(viewNotes['combat-offense']),
    'quickRef.meleeTable': buildQuickWeaponRows(characterData, 'melee'),
    'quickRef.rangedTable': buildQuickWeaponRows(characterData, 'ranged'),
    'quickRef.fullAttackBlock': buildQuickFullAttackBlock(characterData),
    'quickRef.optionsBlock': buildQuickOptionsBlock(characterData),
    'quickRef.conditionalsBlock': buildQuickConditionalsBlock(characterData),
    'quickRef.skillsTable': buildQuickSkillRows(characterData),
    'quickRef.spellLikeBlock': buildQuickSpellLikeBlock(characterData),
    'quickRef.spellBlocks': buildQuickSpellBlocks(casters),

    // No "Unknown" for a sheet without a player, such as a companion's.
    'quick.player': String(description.player ?? ''),
    'quick.identity': statBlockHeader.identity,
    'quick.header': statBlockHeader.lines,
    'quick.defense': buildStatBlockDefense(characterData),
    'quick.offense': buildStatBlockOffense(characterData, casters),
    'quick.statistics': buildStatBlockStatistics(characterData),
    'quick.special': buildStatBlockSpecial(characterData),
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
  const fields = buildFieldMap(parsedData, input.generatedAt ?? new Date())

  return {
    latex: renderTemplate(templateToRender, fields),
    template: templateRecord.info,
  }
}
