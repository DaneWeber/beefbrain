import yaml from 'js-yaml'
import {
  updateCalculatedFields,
  validateBeefBrainData,
  type BeefBrainData,
} from 'bnb-core'
import { LatexGenerationError } from './errors'
import { DEFAULT_TEMPLATE_KEY, getTemplateRecord } from './templates/registry'
import { renderTemplate } from './renderTemplate'
import type {
  LatexFieldMap,
  RenderLatexInput,
  RenderLatexResult,
} from './types'

const DEFAULT_MAX_YAML_BYTES = 256 * 1024
const DEFAULT_MAX_TEMPLATE_BYTES = 256 * 1024

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

function formatEffects(value: unknown): string {
  const record = toRecord(value)
  const entries = Object.entries(record)
  if (entries.length === 0) {
    return ''
  }
  return entries.map(([key, val]) => `${key}=${String(val)}`).join('; ')
}

function formatSkills(skills: Record<string, unknown>): string {
  const rows = Object.entries(skills)
    .filter(([key]) => !key.startsWith('_'))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}: ${String(getArrayFirst(value))}`)

  return rows.length > 0 ? rows.join(', ') : 'None listed'
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
    'abilities.strength.mod': getFirstRecordValue(
      (abilities.strength as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),
    'abilities.dexterity.score': getArrayFirst(abilities.dexterity),
    'abilities.dexterity.mod': getFirstRecordValue(
      (abilities.dexterity as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),
    'abilities.constitution.score': getArrayFirst(abilities.constitution),
    'abilities.constitution.mod': getFirstRecordValue(
      (abilities.constitution as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),
    'abilities.intelligence.score': getArrayFirst(abilities.intelligence),
    'abilities.intelligence.mod': getFirstRecordValue(
      (abilities.intelligence as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),
    'abilities.wisdom.score': getArrayFirst(abilities.wisdom),
    'abilities.wisdom.mod': getFirstRecordValue(
      (abilities.wisdom as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),
    'abilities.charisma.score': getArrayFirst(abilities.charisma),
    'abilities.charisma.mod': getFirstRecordValue(
      (abilities.charisma as unknown[] | undefined)?.[1] as
        | Record<string, unknown>
        | undefined,
    ),

    'combat.hp': getArrayFirst(hpContainer.hp),
    'combat.ac': getArrayFirst(defense.ac),
    'combat.touchAc': getArrayFirst(defense['touch-ac']),
    'combat.flatFootedAc': getArrayFirst(defense['flat-footed-ac']),
    'combat.acp': getArrayFirst(defense.acp),
    'combat.maxDex': getArrayFirst(defense['max-dex']),
    'combat.initiative': getArrayFirst(combat.initiative),
    'combat.defenseSpecial': String(defense.special ?? 'None'),

    'saves.fortitude': getArrayFirst(savesContainer.fortitude),
    'saves.reflex': getArrayFirst(savesContainer.reflex),
    'saves.will': getArrayFirst(savesContainer.will),

    'movement.speed': getArrayFirst(movement.speed),
    'movement.run': getArrayFirst(movement.run),
    'skills.summary': formatSkills(skillsContainer),
    'inventory.equippedMagicItems':
      formatEquippedMagicItems(inventoryContainer),
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
