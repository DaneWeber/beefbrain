export type SpellcastingTradition = 'arcane' | 'divine' | string
export type SpellcastingMode = 'prepared' | 'spontaneous' | string
export type CastingAbility = 'int' | 'wis' | 'cha'

export interface CastingProfile {
  tradition?: SpellcastingTradition
  mode: SpellcastingMode
  ability: CastingAbility
}

export interface SpellMetadata {
  name?: string
  school?: string
  subschool?: string
  descriptors?: string[]
}

export interface SpellDcCondition {
  school?: string
  subschool?: string
  descriptor?: string | string[]
  spell?: string
  [key: string]: unknown
}

export type SpellDcModifier = [
  value: number,
  source: string,
  condition: SpellDcCondition,
]

export interface AppliedSpellDcModifier {
  value: number
  source: string
  condition: SpellDcCondition
}

export interface SpellSaveDcResult {
  total: number
  base: 10
  spellLevel: number
  ability: CastingAbility
  abilityModifier: number
  modifiers: AppliedSpellDcModifier[]
}

export type SpellcastingIssueCode =
  'PREPARED_EXCEEDS_SLOTS' | 'USED_EXCEEDS_SLOTS' | 'INVALID_USED_SLOTS'

export interface SpellcastingIssue {
  code: SpellcastingIssueCode
  caster: string
  spellLevel: number
  slots: number
  actual: number
  message: string
}

export class SpellcastingDataError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SpellcastingDataError'
  }
}

const ABILITY_NAMES: Record<CastingAbility, string> = {
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalize(value: string): string {
  return value.trim().toLowerCase()
}

function isCastingAbility(value: unknown): value is CastingAbility {
  return value === 'int' || value === 'wis' || value === 'cha'
}

export function parseCastingProfile(value: unknown): CastingProfile | null {
  if (!Array.isArray(value) || value.length < 2) return null

  if (value.length >= 3) {
    const [tradition, mode, ability] = value
    if (
      typeof tradition === 'string' &&
      typeof mode === 'string' &&
      isCastingAbility(ability)
    ) {
      return { tradition, mode, ability }
    }
    return null
  }

  const [mode, ability] = value
  if (typeof mode !== 'string' || !isCastingAbility(ability)) return null
  return { mode, ability }
}

/**
 * D&D 3.5e bonus spell slots formula. Level 0 spells never receive a bonus.
 */
export function bonusSpellSlots(
  abilityModifier: number,
  spellLevel: number,
): number {
  if (spellLevel <= 0 || abilityModifier < spellLevel) return 0
  return Math.floor((abilityModifier - spellLevel) / 4) + 1
}

function getAbilityModifier(
  character: Record<string, unknown>,
  ability: CastingAbility,
): number {
  const abilities = character.abilities
  if (!isRecord(abilities)) {
    throw new SpellcastingDataError('Character has no abilities block.')
  }

  const abilityEntry = abilities[ABILITY_NAMES[ability]]
  if (!Array.isArray(abilityEntry) || !isRecord(abilityEntry[1])) {
    throw new SpellcastingDataError(
      `Character has no readable ${ABILITY_NAMES[ability]} modifier.`,
    )
  }

  const modifier = abilityEntry[1][ability]
  if (typeof modifier !== 'number') {
    throw new SpellcastingDataError(
      `Character has no numeric ${ability} modifier.`,
    )
  }
  return modifier
}

function getSpellcasting(
  character: Record<string, unknown>,
): Record<string, unknown> {
  if (!isRecord(character.spells)) {
    throw new SpellcastingDataError('Character has no spells block.')
  }
  return character.spells
}

function parseDcModifiers(spells: Record<string, unknown>): SpellDcModifier[] {
  const defaults = spells._
  if (!isRecord(defaults) || !Array.isArray(defaults['dc-modifiers'])) {
    return []
  }

  return defaults['dc-modifiers'].filter(
    (entry): entry is SpellDcModifier =>
      Array.isArray(entry) &&
      typeof entry[0] === 'number' &&
      typeof entry[1] === 'string' &&
      isRecord(entry[2]),
  )
}

function matchesText(actual: string | undefined, expected: unknown): boolean {
  return (
    typeof expected === 'string' &&
    !!actual &&
    normalize(actual) === normalize(expected)
  )
}

export function matchesSpellDcCondition(
  condition: SpellDcCondition,
  metadata: SpellMetadata,
): boolean {
  for (const [key, expected] of Object.entries(condition)) {
    if (key === 'school' && !matchesText(metadata.school, expected))
      return false
    if (key === 'subschool' && !matchesText(metadata.subschool, expected)) {
      return false
    }
    if (key === 'spell' && !matchesText(metadata.name, expected)) return false
    if (key === 'descriptor') {
      const expectedDescriptors = Array.isArray(expected)
        ? expected.filter((value): value is string => typeof value === 'string')
        : typeof expected === 'string'
          ? [expected]
          : []
      const actualDescriptors = (metadata.descriptors ?? []).map(normalize)
      if (
        expectedDescriptors.length === 0 ||
        !expectedDescriptors.some((value) =>
          actualDescriptors.includes(normalize(value)),
        )
      ) {
        return false
      }
      continue
    }
    if (!['school', 'subschool', 'spell', 'descriptor'].includes(key)) {
      return false
    }
  }
  return true
}

export function getSpellSaveDc(
  characterValue: unknown,
  caster: string,
  spellLevel: number,
  metadata: SpellMetadata = {},
): SpellSaveDcResult {
  if (!Number.isInteger(spellLevel) || spellLevel < 0) {
    throw new SpellcastingDataError(
      `Spell level must be a non-negative integer; received ${spellLevel}.`,
    )
  }
  if (!isRecord(characterValue)) {
    throw new SpellcastingDataError('Character data must be an object.')
  }

  const spells = getSpellcasting(characterValue)
  const casterBlock = spells[caster]
  if (!isRecord(casterBlock)) {
    throw new SpellcastingDataError(
      `Character has no spellcasting block for "${caster}".`,
    )
  }

  const profile = parseCastingProfile(casterBlock.casting)
  if (!profile) {
    throw new SpellcastingDataError(
      `Spellcasting block "${caster}" has an invalid casting profile.`,
    )
  }

  const abilityModifier = getAbilityModifier(characterValue, profile.ability)
  const modifiers = parseDcModifiers(spells)
    .filter(([, , condition]) => matchesSpellDcCondition(condition, metadata))
    .map(([value, source, condition]) => ({ value, source, condition }))
  const total =
    10 +
    spellLevel +
    abilityModifier +
    modifiers.reduce((sum, modifier) => sum + modifier.value, 0)

  return {
    total,
    base: 10,
    spellLevel,
    ability: profile.ability,
    abilityModifier,
    modifiers,
  }
}

function getSlots(
  casterBlock: Record<string, unknown>,
  spellLevel: string,
): number | null {
  if (!isRecord(casterBlock.slots)) return null
  const slotEntry = casterBlock.slots[spellLevel]
  return Array.isArray(slotEntry) && typeof slotEntry[0] === 'number'
    ? slotEntry[0]
    : null
}

export function getSpellcastingIssues(
  characterValue: unknown,
): SpellcastingIssue[] {
  if (!isRecord(characterValue) || !isRecord(characterValue.spells)) return []

  const issues: SpellcastingIssue[] = []
  for (const [caster, casterValue] of Object.entries(characterValue.spells)) {
    if (caster === '_' || !isRecord(casterValue)) continue

    if (isRecord(casterValue.prepared)) {
      for (const [level, prepared] of Object.entries(casterValue.prepared)) {
        if (!Array.isArray(prepared)) continue
        const slots = getSlots(casterValue, level)
        const spellLevel = Number(level)
        if (slots !== null && prepared.length > slots) {
          issues.push({
            code: 'PREPARED_EXCEEDS_SLOTS',
            caster,
            spellLevel,
            slots,
            actual: prepared.length,
            message: `${caster} has ${prepared.length} prepared level ${level} spells but only ${slots} slots.`,
          })
        }
      }
    }

    if (isRecord(casterValue.used)) {
      for (const [level, used] of Object.entries(casterValue.used)) {
        const slots = getSlots(casterValue, level)
        if (slots === null || typeof used !== 'number') continue
        const spellLevel = Number(level)
        if (!Number.isInteger(used) || used < 0) {
          issues.push({
            code: 'INVALID_USED_SLOTS',
            caster,
            spellLevel,
            slots,
            actual: used,
            message: `${caster} has an invalid used-slot count of ${used} at level ${level}.`,
          })
        } else if (used > slots) {
          issues.push({
            code: 'USED_EXCEEDS_SLOTS',
            caster,
            spellLevel,
            slots,
            actual: used,
            message: `${caster} has used ${used} level ${level} slots but only has ${slots}.`,
          })
        }
      }
    }
  }
  return issues
}
