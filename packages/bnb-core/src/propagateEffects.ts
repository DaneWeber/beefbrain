import { sumValues } from './updateCalculatedFields'

/**
 * Thrown when an effect's target path resolves to something the engine
 * doesn't know how to apply a bonus/note to. See docs/bnb-core-item-feat-effects.md.
 * @public
 */
export class EffectTargetError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EffectTargetError'
  }
}

type EffectBonus = Record<string, number | string>

interface ParsedEffect {
  path: string
  bonus?: EffectBonus
  note?: string
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Parses one positional effect entry: [path], [path, bonusDict], [path, note],
 * or [path, bonusDict, note]. Returns null if `raw` isn't a well-formed effect.
 */
function parseEffect(raw: unknown): ParsedEffect | null {
  if (!Array.isArray(raw) || raw.length === 0 || typeof raw[0] !== 'string') {
    return null
  }
  const path = raw[0]
  let bonus: EffectBonus | undefined
  let note: string | undefined
  let idx = 1

  if (isPlainObject(raw[idx])) {
    bonus = raw[idx] as EffectBonus
    idx++
  } else if (typeof raw[idx] === 'string') {
    note = raw[idx]
    idx++
  }

  if (note === undefined && typeof raw[idx] === 'string') {
    note = raw[idx]
  }

  return {
    path,
    ...(bonus !== undefined ? { bonus } : {}),
    ...(note !== undefined ? { note } : {}),
  }
}

function parseTargetPath(path: string): {
  segments: string[]
  bracketIndex?: number
} {
  const match = path.match(/^(.+)\[(\d+)\]$/)
  if (match) {
    return { segments: match[1]!.split('.'), bracketIndex: Number(match[2]) }
  }
  return { segments: path.split('.') }
}

function resolveContainer(
  character: Record<string, unknown>,
  segments: string[],
): unknown {
  let current: unknown = character
  for (const segment of segments) {
    if (!isPlainObject(current)) return undefined
    current = current[segment]
  }
  return current
}

function resolveParent(
  character: Record<string, unknown>,
  segments: string[],
): { parent: Record<string, unknown>; key: string } | null {
  if (segments.length === 0) return null
  const key = segments[segments.length - 1]!
  const parent = resolveContainer(character, segments.slice(0, -1))
  if (!isPlainObject(parent)) return null
  return { parent, key }
}

/** A [total, {mods}, ...] style tuple where mods (element 1) is a plain object. */
function getModsTuple(
  value: unknown,
): { total: number; mods: Record<string, unknown> } | null {
  if (!Array.isArray(value) || value.length < 2) return null
  if (typeof value[0] !== 'number') return null
  if (!isPlainObject(value[1])) return null
  return { total: value[0], mods: value[1] as Record<string, unknown> }
}

/** A named weapon tuple: [total, damageString, criticalString, {atkMods}, ...]. */
function isNamedWeaponTuple(value: unknown): value is unknown[] {
  return (
    Array.isArray(value) &&
    value.length >= 4 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'string'
  )
}

/** Merges bonus/note into mods, returns true if anything actually changed. */
function mergeIntoMods(
  mods: Record<string, unknown>,
  bonus: EffectBonus | undefined,
  note: string | undefined,
): boolean {
  let changed = false
  if (bonus) {
    for (const [key, value] of Object.entries(bonus)) {
      if (mods[key] !== value) {
        mods[key] = value
        changed = true
      }
    }
  }
  if (note !== undefined && mods.note !== note) {
    mods.note = note
    changed = true
  }
  return changed
}

function pushTagIfMissing(tags: unknown[], note: string): boolean {
  if (tags.includes(note)) return false
  tags.push(note)
  return true
}

/**
 * Applies a note-only effect (no bonus dict). No bracket is needed: the target
 * shape tells the engine where the note goes.
 *   - undefined            -> create a fresh [note] tag list.
 *   - a flat tag list      -> push the note onto it (combat.defense.special).
 *   - [total, {mods}, [tags]] -> push the note onto the trailing tags array
 *     (combat.attack.melee._), since a note carries no ambiguity about which
 *     "channel" it belongs to.
 *   - a plain [total, {mods}] with no trailing array -> fall back to a `note`
 *     key inside mods (rare; most targets with a note have a dedicated array).
 */
function applyNoteOnly(
  parent: Record<string, unknown>,
  key: string,
  path: string,
  note: string,
): boolean {
  const existing = parent[key]

  if (existing === undefined) {
    parent[key] = [note]
    return true
  }

  if (!Array.isArray(existing)) {
    throw new EffectTargetError(
      `Effect target "${path}" does not resolve to a value this engine can attach a note to.`,
    )
  }

  if (typeof existing[0] !== 'number') {
    // Already a flat tag list, e.g. combat.defense.special: [blind-fight].
    return pushTagIfMissing(existing, note)
  }

  const last = existing[existing.length - 1]
  if (Array.isArray(last)) {
    return pushTagIfMissing(last, note)
  }

  const tuple = getModsTuple(existing)
  if (!tuple) {
    throw new EffectTargetError(
      `Effect target "${path}" does not resolve to a value this engine can attach a note to.`,
    )
  }
  return mergeIntoMods(tuple.mods, undefined, note)
}

function applyWithoutBracket(
  parent: Record<string, unknown>,
  key: string,
  path: string,
  effect: ParsedEffect,
): boolean {
  const existing = parent[key]

  if (effect.bonus) {
    const tuple = getModsTuple(existing)
    if (!tuple) {
      throw new EffectTargetError(
        `Effect target "${path}" does not resolve to a [total, {components}] value.`,
      )
    }
    const modsChanged = mergeIntoMods(tuple.mods, effect.bonus, effect.note)
    if (!modsChanged) return false
    parent[key] = [sumValues(tuple.mods), tuple.mods]
    return true
  }

  if (effect.note === undefined) return false
  return applyNoteOnly(parent, key, path, effect.note)
}

/**
 * A bracket is only meaningful on a named weapon, to pick which numeric
 * channel (attack/damage/critical) an effect targets — everything else
 * (including note-only tag pushes) is resolved without one; see
 * applyNoteOnly.
 */
function applyWithBracket(
  parent: Record<string, unknown>,
  key: string,
  bracketIndex: number,
  path: string,
  effect: ParsedEffect,
): boolean {
  const existing = parent[key]

  if (!isNamedWeaponTuple(existing)) {
    throw new EffectTargetError(
      `Effect target "${path}[${bracketIndex}]": a bracket is only valid on a named weapon ` +
        '(to select the attack/damage/critical channel). Omit the bracket for other targets.',
    )
  }

  if (bracketIndex === 0) {
    const atkMods = existing[3]
    if (!isPlainObject(atkMods)) {
      throw new EffectTargetError(
        `Effect target "${path}" has no attack-bonus component map at index 3.`,
      )
    }
    const modsChanged = mergeIntoMods(atkMods, effect.bonus, effect.note)
    if (!modsChanged) return false
    existing[0] = sumValues(atkMods)
    return true
  }
  if (bracketIndex === 1) {
    throw new EffectTargetError(
      `Effect target "${path}": damage-bonus channel ([1]) is not implemented yet. ` +
        'See docs/bnb-core-item-feat-effects.md.',
    )
  }
  if (bracketIndex === 2) {
    throw new EffectTargetError(
      `Effect target "${path}": critical-multiplier channel ([2]) is not implemented yet. ` +
        'See docs/bnb-core-item-feat-effects.md.',
    )
  }
  throw new EffectTargetError(
    `Effect target "${path}[${bracketIndex}]": only channels 0 (attack), 1 (damage), ` +
      'and 2 (critical) are meaningful on a named weapon.',
  )
}

function applyEffect(
  character: Record<string, unknown>,
  effect: ParsedEffect,
): boolean {
  const { segments, bracketIndex } = parseTargetPath(effect.path)
  if (segments[0] === 'abilities') {
    throw new EffectTargetError(
      `Effect target "${effect.path}": ability score targets are not supported. ` +
        'Use item ability bonuses (propagateEquipmentToAbilities) instead. ' +
        'See docs/bnb-core-item-feat-effects.md.',
    )
  }
  const resolved = resolveParent(character, segments)
  if (!resolved) {
    throw new EffectTargetError(
      `Effect target "${effect.path}" does not resolve to a known location.`,
    )
  }
  const { parent, key } = resolved

  if (bracketIndex === undefined) {
    return applyWithoutBracket(parent, key, effect.path, effect)
  }
  return applyWithBracket(parent, key, bracketIndex, effect.path, effect)
}

function collectEffectEntries(effectsValue: unknown): ParsedEffect[] {
  if (!Array.isArray(effectsValue)) return []
  const parsed: ParsedEffect[] = []
  for (const raw of effectsValue) {
    const effect = parseEffect(raw)
    if (effect) parsed.push(effect)
  }
  return parsed
}

function getFeatEffects(character: Record<string, unknown>): ParsedEffect[] {
  const special = character.special
  if (!isPlainObject(special)) return []
  const feats = special.feats
  if (!Array.isArray(feats)) return []

  const effects: ParsedEffect[] = []
  for (const featArr of feats) {
    if (!Array.isArray(featArr) || featArr.length < 3) continue
    effects.push(...collectEffectEntries(featArr[2]))
  }
  return effects
}

function getAllItemEffects(inventory: Record<string, unknown>): ParsedEffect[] {
  const effects: ParsedEffect[] = []
  for (const [key, value] of Object.entries(inventory)) {
    if (key.startsWith('_') || key === 'money' || !Array.isArray(value)) {
      continue
    }
    for (const item of value) {
      if (!Array.isArray(item) || item.length < 8) continue
      effects.push(...collectEffectEntries(item[7]))
    }
  }
  return effects
}

function getActiveItemEffects(
  inventory: Record<string, unknown>,
): ParsedEffect[] {
  const onList = inventory._on as string[] | undefined
  const equippedContainers = onList || ['equipped']

  const effects: ParsedEffect[] = []
  for (const containerName of equippedContainers) {
    const items = inventory[containerName]
    if (!Array.isArray(items)) continue
    for (const item of items) {
      if (!Array.isArray(item) || item.length < 8) continue
      effects.push(...collectEffectEntries(item[7]))
    }
  }
  return effects
}

/** Bonus key names declared per target path, across every feat/item in the file. */
function collectBonusKeysByPath(
  effects: ParsedEffect[],
): Map<string, Set<string>> {
  const byPath = new Map<string, Set<string>>()
  for (const effect of effects) {
    if (!effect.bonus) continue
    const keys = byPath.get(effect.path) ?? new Set<string>()
    for (const key of Object.keys(effect.bonus)) {
      keys.add(key)
    }
    byPath.set(effect.path, keys)
  }
  return byPath
}

/**
 * Removes bonus keys that some feat/item in the file declares but which are no
 * longer active (e.g. the item was unequipped), leaving currently-active keys
 * untouched so idempotent reruns don't spuriously report a change.
 */
function removeInactiveBonusKeys(
  character: Record<string, unknown>,
  declaredByPath: Map<string, Set<string>>,
  activeByPath: Map<string, Set<string>>,
): boolean {
  let changed = false
  for (const [path, declaredKeys] of declaredByPath.entries()) {
    const activeKeys = activeByPath.get(path)
    const staleKeys = [...declaredKeys].filter((k) => !activeKeys?.has(k))
    if (staleKeys.length === 0) continue

    const { segments, bracketIndex } = parseTargetPath(path)
    const resolved = resolveParent(character, segments)
    if (!resolved) continue
    const { parent, key } = resolved
    const existing = parent[key]

    let mods: Record<string, unknown> | null = null
    let total: number | null = null
    if (bracketIndex === undefined) {
      const tuple = getModsTuple(existing)
      mods = tuple?.mods ?? null
      total = tuple?.total ?? null
    } else if (bracketIndex === 0 && isNamedWeaponTuple(existing)) {
      const atkMods = existing[3]
      mods = isPlainObject(atkMods) ? atkMods : null
      total = typeof existing[0] === 'number' ? existing[0] : null
    }
    if (!mods) continue

    let modsChanged = false
    for (const bonusKey of staleKeys) {
      if (bonusKey in mods) {
        delete mods[bonusKey]
        modsChanged = true
      }
    }
    if (!modsChanged) continue

    const newTotal = sumValues(mods)
    if (bracketIndex === undefined) {
      parent[key] = [newTotal, mods]
    } else if (isNamedWeaponTuple(existing)) {
      existing[0] = newTotal
    }
    changed = changed || newTotal !== total || modsChanged
  }
  return changed
}

/**
 * Propagates feat and equipped-item effects (see docs/bnb-core-item-feat-effects.md)
 * onto the rest of the character sheet.
 */
export function propagateEffects(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const character = data.character
  if (!character) return hasChanges

  const inventory = isPlainObject(character.inventory)
    ? (character.inventory as Record<string, unknown>)
    : {}

  const featEffects = getFeatEffects(character)
  const allItemEffects = getAllItemEffects(inventory)
  const activeItemEffects = getActiveItemEffects(inventory)
  const activeEffects = [...featEffects, ...activeItemEffects]

  const declaredByPath = collectBonusKeysByPath([
    ...featEffects,
    ...allItemEffects,
  ])
  const activeByPath = collectBonusKeysByPath(activeEffects)
  if (removeInactiveBonusKeys(character, declaredByPath, activeByPath)) {
    hasChanges = true
  }

  for (const effect of activeEffects) {
    if (applyEffect(character, effect)) {
      hasChanges = true
    }
  }

  return hasChanges
}
