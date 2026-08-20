import { parse as parseYAML } from 'yaml'
import { dataToCompactYAML } from './dataToCompactYAML'
import type { Character, Abilities } from '.'
import { loadSchema } from './schemaLoader'
import { calculateFieldValue, getAbilityArrayType } from './calculationEngine'
import { applyComponentBindings } from './genericEngine'
// BAB and save progression formulas (used by class entries in character YAML)
function calculateBab(progression: string, level: number): number {
  switch (progression) {
    case 'good':
      return level
    case 'average':
      return Math.floor((level * 3) / 4)
    case 'poor':
      return Math.floor(level / 2)
    default:
      return 0
  }
}

function calculateBaseSave(progression: string, level: number): number {
  switch (progression) {
    case 'good':
      return 2 + Math.floor(level / 2)
    case 'poor':
      return Math.floor(level / 3)
    default:
      return 0
  }
}

// Maps ability name to its abbreviation used in modifier objects
const ABILITY_ABBR: Record<string, string> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

/**
 * Equipment stats derived from inventory
 */
interface EquipmentStats {
  armorAc: number
  shieldAc: number
  armorAcp: number
  shieldAcp: number
  armorMaxDex: number | null // null means no limit
  armorCategory: 'none' | 'light' | 'medium' | 'heavy'
}

/**
 * Load category effects
 */
interface LoadEffects {
  category: 'light' | 'medium' | 'heavy' | 'unknown'
  maxDex: number | null // null means no limit
  acp: number
  speedReduction30: number // reduction for 30ft base speed
  speedReduction20: number // reduction for 20ft base speed
}

/**
 * Updates the calculated fields in a Beef Brain data file.
 * @param yamlContent - The YAML content to update
 * @returns Updated YAML content with calculated fields
 * @public
 */
export function updateCalculatedFields(yamlContent: string): string {
  const data = parseYAML(yamlContent)
  let hasChanges = false
  if (data.character === null) {
    return yamlContent
  }
  const character = data.character as Character

  if (!data.character?.abilities) {
    if (hasChanges) return dataToCompactYAML(data)
    return yamlContent
  }

  const abilities = data.character.abilities as Abilities

  // Load schema once for the entire calculation
  const schema = loadSchema('dnd35-character')

  // Step 0: Read magic item bonuses from equipment and apply to ability components
  hasChanges = propagateEquipmentToAbilities(data, hasChanges)

  // Step 1: Calculate ability scores and modifiers
  hasChanges = calculateAbilityScores(character, hasChanges, data, schema)

  // Step 2: Build ability modifier map
  const abilityMods = getAbilityModifiers(abilities)

  // Step 3: Read equipment and load stats
  const equipStats = readEquipmentStats(data)
  const loadEffects = determineLoadCategory(data)

  // Step 4: Propagate carrying capacity (needed before load effects)
  hasChanges = propagateToCarryingCapacity(data, abilities, hasChanges)

  // Recalculate load effects after capacity update
  const updatedLoadEffects = determineLoadCategory(data)

  // Step 5: Calculate effective ACP and max-dex
  const effectiveAcp = calculateEffectiveAcp(equipStats, updatedLoadEffects)
  const effectiveMaxDex = calculateEffectiveMaxDex(
    equipStats,
    updatedLoadEffects,
  )

  // Step 6: Derive class-based values (must run before bindings so BAB is available)
  hasChanges = propagateToHitDice(data, hasChanges)
  hasChanges = propagateToBab(data, hasChanges)
  hasChanges = propagateToBaseSaves(data, abilityMods, hasChanges)

  // Step 7: Apply schema-driven component bindings
  // This handles ability mod propagation to skills, saves, initiative,
  // melee/ranged/grapple, and BAB within attacks.
  if (schema.componentBindings) {
    if (applyComponentBindings(data, schema.componentBindings)) {
      hasChanges = true
    }
  }

  // Step 8: Specialized propagation that overrides bindings where needed
  // (e.g., dex capped by max-dex in AC, con*HD in max-hp, bonus spell slots)
  hasChanges = propagateToSkillAcp(data, effectiveAcp, hasChanges)
  hasChanges = propagateToDefense(
    data,
    abilityMods,
    equipStats,
    effectiveMaxDex,
    effectiveAcp,
    hasChanges,
  )
  hasChanges = propagateToMaxHp(data, abilityMods, hasChanges)
  hasChanges = propagateToMeleeWeaponDetails(data, abilityMods, hasChanges)
  hasChanges = propagateToRangedWeaponDetails(data, hasChanges)
  hasChanges = propagateToInventoryWeight(data, hasChanges)
  hasChanges = propagateToSynergy(data, hasChanges)
  hasChanges = propagateToSpeed(
    data,
    equipStats,
    updatedLoadEffects,
    hasChanges,
  )
  hasChanges = propagateToSpellSlots(data, abilityMods, hasChanges)

  if (hasChanges) {
    return dataToCompactYAML(data)
  }
  return yamlContent
}

// Ability abbreviation to full name mapping (reverse of ABILITY_ABBR)
const ABBR_TO_ABILITY: Record<string, string> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

function parseAbilityBonusKey(
  key: string,
): { abilityName: string; normalizedKey: string } | null {
  if (key in ABBR_TO_ABILITY) {
    return {
      abilityName: ABBR_TO_ABILITY[key]!,
      normalizedKey: key,
    }
  }

  const enhancementMatch = key.match(
    /^(str|dex|con|int|wis|cha|strength|dexterity|constitution|intelligence|wisdom|charisma)-enhancement$/,
  )
  if (!enhancementMatch) return null

  const rawAbility = enhancementMatch[1]!
  const abilityName =
    rawAbility in ABBR_TO_ABILITY ? ABBR_TO_ABILITY[rawAbility]! : rawAbility
  const normalizedKey = `${ABILITY_ABBR[abilityName]}-enhancement`
  return { abilityName, normalizedKey }
}

/**
 * Read magic item bonuses from equipped items and apply to ability score components.
 * Items specify ability bonuses in their properties, e.g.:
 *   [belt of giant strength, 1, wondrous, 0 lbs, 4000 gp, {str: 4}]
 * This adds/updates the component in the ability's components object.
 */
function propagateEquipmentToAbilities(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const abilities = data.character?.abilities as
    | Record<string, unknown>
    | undefined
  const inventory = data.character?.inventory as
    | Record<string, unknown>
    | undefined
  if (!abilities || !inventory) return hasChanges

  // Collect ability bonuses from all equipped items
  const abilityBonuses: Record<
    string,
    Array<{ source: string; value: number; normalizedKey: string }>
  > = {}

  const onList = inventory._on as string[] | undefined
  const equippedContainers = onList || ['equipped']

  for (const containerName of equippedContainers) {
    const items = inventory[containerName] as unknown[][] | undefined
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (!Array.isArray(item) || item.length < 3) continue
      const itemName = item[0] as string
      const props = item[5] as Record<string, unknown> | undefined

      // Only wondrous items / magic items contribute ability bonuses
      // But also check armor/shield/weapon props for ability bonuses
      if (!props || typeof props !== 'object') continue

      // Check for ability score keys in properties
      for (const [key, value] of Object.entries(props)) {
        if (typeof value !== 'number') continue
        const parsed = parseAbilityBonusKey(key)
        if (!parsed) continue
        const { abilityName, normalizedKey } = parsed
        if (!abilityBonuses[abilityName]) abilityBonuses[abilityName] = []
        abilityBonuses[abilityName].push({
          source: itemName,
          value,
          normalizedKey,
        })
      }
    }
  }

  // Clear previous enhancement-style components so unequipping/moving items
  // does not leave stale equipment bonuses behind.
  for (const abilityArr of Object.values(abilities)) {
    if (!Array.isArray(abilityArr) || abilityArr.length < 3) continue
    const components = abilityArr[2]
    if (
      !components ||
      typeof components !== 'object' ||
      Array.isArray(components)
    )
      continue
    const comps = components as Record<string, number>
    for (const key of Object.keys(comps)) {
      if (key.endsWith('-enhancement')) {
        delete comps[key]
        hasChanges = true
      }
    }
  }

  // Apply bonuses to ability score components
  for (const [abilityName, bonuses] of Object.entries(abilityBonuses)) {
    const abilityArr = abilities[abilityName]
    if (!Array.isArray(abilityArr) || abilityArr.length < 3) continue

    const components = abilityArr[2]
    if (
      !components ||
      typeof components !== 'object' ||
      Array.isArray(components)
    )
      continue
    const comps = components as Record<string, number>

    for (const { source, value, normalizedKey } of bonuses) {
      // Use a sanitized item name as the component key
      const key = normalizedKey.endsWith('-enhancement')
        ? normalizedKey
        : source.toLowerCase().replace(/\s+/g, '-')
      if (comps[key] !== value) {
        comps[key] = value
        hasChanges = true
      }
    }
  }

  return hasChanges
}

/**
 * Read equipment stats from equipped inventory items
 */
function readEquipmentStats(data: {
  character?: Record<string, unknown>
}): EquipmentStats {
  const result: EquipmentStats = {
    armorAc: 0,
    shieldAc: 0,
    armorAcp: 0,
    shieldAcp: 0,
    armorMaxDex: null,
    armorCategory: 'none',
  }

  const inventory = data.character?.inventory as
    | Record<string, unknown>
    | undefined
  if (!inventory) return result

  // Find equipped items — look at _on list or default to "equipped"
  const onList = inventory._on as string[] | undefined
  const equippedContainers = onList || ['equipped']

  for (const containerName of equippedContainers) {
    const items = inventory[containerName] as unknown[][] | undefined
    if (!Array.isArray(items)) continue

    for (const item of items) {
      if (!Array.isArray(item) || item.length < 3) continue
      const category = item[2] as string
      const props = item[5] as Record<string, unknown> | undefined

      if (!props || typeof props !== 'object') continue

      if (category === 'armor') {
        if (typeof props.ac === 'number') result.armorAc = props.ac
        if (typeof props.acp === 'number') result.armorAcp = props.acp
        if (typeof props['max-dex'] === 'number')
          result.armorMaxDex = props['max-dex']
        // Detect armor weight category from tags
        const tags = Array.isArray(item[item.length - 1])
          ? (item[item.length - 1] as string[])
          : []
        if (tags.includes('heavy-armor')) result.armorCategory = 'heavy'
        else if (tags.includes('medium-armor')) result.armorCategory = 'medium'
        else if (tags.includes('light-armor')) result.armorCategory = 'light'
        else result.armorCategory = 'light' // default if not tagged
      } else if (category === 'shield') {
        if (typeof props.ac === 'number') result.shieldAc = props.ac
        if (typeof props.acp === 'number') result.shieldAcp = props.acp
      }
    }
  }

  return result
}

/**
 * Determine load category from current load weight vs carrying capacity
 */
function determineLoadCategory(data: {
  character?: Record<string, unknown>
}): LoadEffects {
  const defaultEffects: LoadEffects = {
    category: 'unknown',
    maxDex: null,
    acp: 0,
    speedReduction30: 0,
    speedReduction20: 0,
  }

  const movement = data.character?.movement as
    | Record<string, unknown>
    | undefined
  if (!movement?.load || !movement?.capacity) return defaultEffects

  const loadArr = movement.load as unknown[]
  if (!Array.isArray(loadArr) || loadArr.length < 1) return defaultEffects

  // Parse weight from string like "75.5 lbs"
  const loadStr = String(loadArr[0])
  const weightMatch = loadStr.match(/^([0-9.]+)/)
  if (!weightMatch) return defaultEffects
  const currentWeight = parseFloat(weightMatch[1]!)

  const cap = movement.capacity as Record<string, string>
  const parseWeight = (s: string): number => {
    const m = String(s).match(/^([0-9.]+)/)
    return m ? parseFloat(m[1]!) : 0
  }

  const lightMax = parseWeight(cap.light || '0')
  const mediumMax = parseWeight(cap.medium || '0')

  if (currentWeight <= lightMax) {
    return {
      category: 'light',
      maxDex: null,
      acp: 0,
      speedReduction30: 0,
      speedReduction20: 0,
    }
  } else if (currentWeight <= mediumMax) {
    return {
      category: 'medium',
      maxDex: 3,
      acp: -3,
      speedReduction30: -10,
      speedReduction20: -5,
    }
  } else {
    return {
      category: 'heavy',
      maxDex: 1,
      acp: -6,
      speedReduction30: -10,
      speedReduction20: -5,
    }
  }
}

function calculateEffectiveAcp(
  equip: EquipmentStats,
  load: LoadEffects,
): { value: number; sources: Record<string, number> } {
  const equipAcp = equip.armorAcp + equip.shieldAcp
  const loadAcp = load.acp

  // Use the worse (more negative) of equipment or load
  if (equipAcp !== 0 && equipAcp <= loadAcp) {
    // Equipment is worse or equal
    const sources: Record<string, number> = {}
    if (equip.armorAcp !== 0) sources['armor'] = equip.armorAcp
    if (equip.shieldAcp !== 0) sources['shield'] = equip.shieldAcp
    return { value: equipAcp, sources }
  } else if (loadAcp < 0) {
    // Load is worse
    const categoryKey = `${load.category}-load`
    return { value: loadAcp, sources: { [categoryKey]: loadAcp } }
  }

  return { value: 0, sources: {} }
}

function calculateEffectiveMaxDex(
  equip: EquipmentStats,
  load: LoadEffects,
): { value: number | null; sources: Record<string, number> } {
  const armorMax = equip.armorMaxDex
  const loadMax = load.maxDex

  if (armorMax !== null && loadMax !== null) {
    // Both apply — use the worse (lower)
    if (armorMax <= loadMax) {
      return { value: armorMax, sources: { armor: armorMax } }
    } else {
      const categoryKey = `${load.category}-load`
      return { value: loadMax, sources: { [categoryKey]: loadMax } }
    }
  } else if (armorMax !== null) {
    return { value: armorMax, sources: { armor: armorMax } }
  } else if (loadMax !== null) {
    const categoryKey = `${load.category}-load`
    return { value: loadMax, sources: { [categoryKey]: loadMax } }
  }

  return { value: null, sources: {} }
}

/**
 * Get the current modifier value for each ability from the parsed data
 */
function getAbilityModifiers(abilities: Abilities): Record<string, number> {
  const mods: Record<string, number> = {}
  for (const [abilityName, abilityArr] of Object.entries(abilities)) {
    const abbr = ABILITY_ABBR[abilityName]
    if (!abbr || !Array.isArray(abilityArr)) continue
    const score = abilityArr[0]
    if (typeof score === 'number') {
      mods[abbr] = Math.floor((score - 10) / 2)
    }
  }
  return mods
}

/**
 * Update a [total, {key: val, ...}] style array:
 * sets modifiers[abbrKey] = newMod, recalculates total as sum of modifiers.
 * Returns true if any change was made.
 */
function updateModifierArray(
  arr: unknown[],
  abbrKey: string,
  newMod: number,
): boolean {
  if (!Array.isArray(arr) || arr.length < 2) return false
  const modifiers = arr[1]
  if (!modifiers || typeof modifiers !== 'object' || Array.isArray(modifiers))
    return false

  const mods = modifiers as Record<string, number>
  let changed = false

  if (abbrKey in mods && mods[abbrKey] !== newMod) {
    mods[abbrKey] = newMod
    changed = true
  }

  if (changed) {
    const newTotal = sumValues(mods)
    if (arr[0] !== newTotal) {
      arr[0] = newTotal
    }
  }
  return changed
}

/**
 * Like updateModifierArray but also verifies the total even when no modifier changed.
 * Use this for fields where we know the total should always equal the sum.
 */
function updateAndVerifyModifierArray(
  arr: unknown[],
  abbrKey: string,
  newMod: number,
): boolean {
  if (!Array.isArray(arr) || arr.length < 2) return false
  const modifiers = arr[1]
  if (!modifiers || typeof modifiers !== 'object' || Array.isArray(modifiers))
    return false

  const mods = modifiers as Record<string, number>
  let changed = false

  if (abbrKey in mods && mods[abbrKey] !== newMod) {
    mods[abbrKey] = newMod
    changed = true
  }

  const newTotal = sumValues(mods)
  if (arr[0] !== newTotal) {
    arr[0] = newTotal
    changed = true
  }

  return changed
}

function sumValues(obj: Record<string, unknown>): number {
  let sum = 0
  for (const v of Object.values(obj)) {
    if (typeof v === 'number') sum += v
  }
  return sum
}

// --- Propagation functions ---

// Skills that take double ACP (swim in D&D 3.5e)
// TODO: move to schema as a conditional component or skill property
const DOUBLE_ACP_SKILLS = new Set(['swim'])

/**
 * Propagate ACP to skills that have an 'acp' component.
 * Ability mod propagation is now handled by componentBindings.
 */
function propagateToSkillAcp(
  data: { character?: Record<string, unknown> },
  effectiveAcp: { value: number; sources: Record<string, number> },
  hasChanges: boolean,
): boolean {
  const skills = data.character?.skills as Record<string, unknown> | undefined
  if (!skills) return hasChanges

  for (const [skillName, skillArr] of Object.entries(skills)) {
    if (!Array.isArray(skillArr) || skillArr.length < 2) continue
    const mods = skillArr[1]
    if (!mods || typeof mods !== 'object' || Array.isArray(mods)) continue

    const modsObj = mods as Record<string, number>

    // Update ACP in skills that have it
    if ('acp' in modsObj && effectiveAcp.value !== 0) {
      const acpForSkill = DOUBLE_ACP_SKILLS.has(skillName)
        ? effectiveAcp.value * 2
        : effectiveAcp.value
      if (modsObj.acp !== acpForSkill) {
        modsObj.acp = acpForSkill
        const newTotal = sumValues(modsObj)
        if (skillArr[0] !== newTotal) {
          skillArr[0] = newTotal
        }
        hasChanges = true
      }
    }
  }
  return hasChanges
}

/**
 * Handle named melee weapon details: generic attack propagation, damage strings.
 * Ability mod and BAB binding to generic attacks is handled by componentBindings.
 */
function propagateToMeleeWeaponDetails(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const attack = (data.character?.combat as Record<string, unknown>)?.attack as
    | Record<string, unknown>
    | undefined
  if (!attack?.melee) return hasChanges

  const melee = attack.melee as Record<string, unknown>
  const strMod = abilityMods['str'] ?? 0

  for (const [weaponName, weaponArr] of Object.entries(melee)) {
    if (weaponName === '_') continue
    if (!Array.isArray(weaponArr) || weaponArr.length < 5) continue

    // Propagate generic melee total to weaponArr[3]._
    if (
      melee._ &&
      Array.isArray(melee._) &&
      typeof (melee._ as unknown[])[0] === 'number'
    ) {
      if (weaponArr[3] && typeof weaponArr[3] === 'object') {
        const atkMods = weaponArr[3] as Record<string, number>
        if (atkMods._ !== (melee._ as unknown[])[0]) {
          atkMods._ = (melee._ as unknown[])[0] as number
          hasChanges = true
        }
      }
    }

    // Sum all values in weaponArr[3] for total attack bonus
    if (weaponArr[3] && typeof weaponArr[3] === 'object') {
      const atkBonus = sumValues(weaponArr[3] as Record<string, unknown>)
      if (typeof weaponArr[0] === 'number' && weaponArr[0] !== atkBonus) {
        weaponArr[0] = atkBonus
        hasChanges = true
      }
    }

    // Update weapon damage string
    if (typeof weaponArr[1] === 'string') {
      const tags = Array.isArray(weaponArr[weaponArr.length - 1])
        ? (weaponArr[weaponArr.length - 1] as string[])
        : []
      const isTwoHanded =
        tags.includes('two-handed') ||
        tags.includes('2h') ||
        tags.includes('2-hand')
      const isOffHand = tags.includes('off-hand') || tags.includes('oh')
      const isSecondary = tags.includes('secondary')

      // Calculate str component for damage based on wielding mode
      let strDamageMod = strMod
      if (isTwoHanded) {
        strDamageMod = Math.floor(strMod * 1.5)
      } else if (isOffHand) {
        strDamageMod = Math.floor(strMod * 0.5)
      } else if (isSecondary) {
        strDamageMod = Math.floor(strMod * 0.5)
      }

      // Update str in the damage breakdown (position 4)
      if (
        weaponArr[4] &&
        typeof weaponArr[4] === 'object' &&
        !Array.isArray(weaponArr[4]) &&
        'str' in weaponArr[4]
      ) {
        if ((weaponArr[4] as Record<string, number>).str !== strDamageMod) {
          ;(weaponArr[4] as Record<string, number>).str = strDamageMod
          hasChanges = true
        }
      }

      // Sum the damage breakdown to get total damage bonus
      const damageObj = weaponArr[4]
      let totalDamageMod: number | null = null
      if (
        damageObj &&
        typeof damageObj === 'object' &&
        !Array.isArray(damageObj)
      ) {
        totalDamageMod = sumValues(damageObj as Record<string, unknown>)
      }

      // Update damage string with the total damage modifier
      if (totalDamageMod !== null) {
        const sign = totalDamageMod >= 0 ? '+' : '-'
        const absVal = Math.abs(totalDamageMod)
        const newDamage = weaponArr[1].replace(
          /(\d+d\d+(?:\+\d+d\d+[^+-]*)?)[+-]\d+/,
          `$1${sign}${absVal}`,
        )
        if (newDamage !== weaponArr[1]) {
          weaponArr[1] = newDamage
          hasChanges = true
        }
      }
    }
  }
  return hasChanges
}

/**
 * Handle named ranged weapon details: generic attack propagation.
 * Ability mod and BAB binding to generic attacks is handled by componentBindings.
 */
function propagateToRangedWeaponDetails(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const attack = (data.character?.combat as Record<string, unknown>)?.attack as
    | Record<string, unknown>
    | undefined
  if (!attack?.ranged) return hasChanges

  const ranged = attack.ranged as Record<string, unknown>

  for (const [weaponName, weaponArr] of Object.entries(ranged)) {
    if (weaponName === '_') continue
    if (!Array.isArray(weaponArr) || weaponArr.length < 4) continue

    // Propagate generic ranged total to weaponArr[3]._
    if (
      ranged._ &&
      Array.isArray(ranged._) &&
      typeof (ranged._ as unknown[])[0] === 'number'
    ) {
      if (weaponArr[3] && typeof weaponArr[3] === 'object') {
        const atkMods = weaponArr[3] as Record<string, number>
        if (atkMods._ !== (ranged._ as unknown[])[0]) {
          atkMods._ = (ranged._ as unknown[])[0] as number
          hasChanges = true
        }
      }
    }

    // Sum all values in weaponArr[3] for total attack bonus
    if (weaponArr[3] && typeof weaponArr[3] === 'object') {
      const atkBonus = sumValues(weaponArr[3] as Record<string, unknown>)
      if (typeof weaponArr[0] === 'number' && weaponArr[0] !== atkBonus) {
        weaponArr[0] = atkBonus
        hasChanges = true
      }
    }
  }
  return hasChanges
}

function propagateToDefense(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  equipStats: EquipmentStats,
  effectiveMaxDex: { value: number | null; sources: Record<string, number> },
  effectiveAcp: { value: number; sources: Record<string, number> },
  hasChanges: boolean,
): boolean {
  const defense = (data.character?.combat as Record<string, unknown>)
    ?.defense as Record<string, unknown> | undefined
  if (!defense) return hasChanges

  const dexMod = abilityMods['dex'] ?? 0

  // Cap dex mod by effective max-dex for AC purposes
  const dexForAc =
    effectiveMaxDex.value !== null
      ? Math.min(dexMod, effectiveMaxDex.value)
      : dexMod

  // AC: [total, {base: 10, armor: N, shield: N, dex: n, ...}]
  if (defense.ac && Array.isArray(defense.ac)) {
    const acArr = defense.ac as unknown[]
    if (
      acArr.length >= 2 &&
      typeof acArr[1] === 'object' &&
      !Array.isArray(acArr[1])
    ) {
      const mods = acArr[1] as Record<string, number>
      let changed = false

      // Update dex (capped)
      if (mods.dex !== dexForAc) {
        mods.dex = dexForAc
        changed = true
      }

      // Update armor bonus from equipment
      if (equipStats.armorAc > 0) {
        if (mods.armor !== equipStats.armorAc) {
          mods.armor = equipStats.armorAc
          changed = true
        }
      }
      if (equipStats.shieldAc > 0) {
        if (mods.shield !== equipStats.shieldAc) {
          mods.shield = equipStats.shieldAc
          changed = true
        }
      }

      if (changed) {
        acArr[0] = sumValues(mods)
        hasChanges = true
      }
    }
  }

  // Touch AC: [total, {base: 10, dex: n, ...}] — no armor, shield, or natural armor
  if (defense['touch-ac'] && Array.isArray(defense['touch-ac'])) {
    if (
      updateAndVerifyModifierArray(
        defense['touch-ac'] as unknown[],
        'dex',
        dexForAc,
      )
    ) {
      hasChanges = true
    }
  }

  // Flat-footed AC: spread format, include armor+shield but dex only if negative
  if (defense['flat-footed-ac'] && Array.isArray(defense['flat-footed-ac'])) {
    const ffArr = defense['flat-footed-ac'] as unknown[]
    if (ffArr.length >= 2) {
      // Collect all modifier key-value pairs from positions 1+
      const mods: Array<[string, number]> = []
      for (let i = 1; i < ffArr.length; i++) {
        const el = ffArr[i]
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          for (const [k, v] of Object.entries(el as Record<string, unknown>)) {
            if (typeof v === 'number') mods.push([k, v])
          }
        }
      }

      let ffChanged = false

      // Update armor/shield in flat-footed
      if (equipStats.armorAc > 0) {
        const armorEntry = mods.find(([k]) => k === 'armor')
        if (armorEntry) {
          if (armorEntry[1] !== equipStats.armorAc) {
            armorEntry[1] = equipStats.armorAc
            ffChanged = true
          }
        } else {
          mods.push(['armor', equipStats.armorAc])
          ffChanged = true
        }
      }
      if (equipStats.shieldAc > 0) {
        const shieldEntry = mods.find(([k]) => k === 'shield')
        if (shieldEntry) {
          if (shieldEntry[1] !== equipStats.shieldAc) {
            shieldEntry[1] = equipStats.shieldAc
            ffChanged = true
          }
        } else {
          mods.push(['shield', equipStats.shieldAc])
          ffChanged = true
        }
      }

      // Apply dex rule: include only if negative
      const dexIdx = mods.findIndex(([k]) => k === 'dex')
      if (dexMod < 0) {
        if (dexIdx >= 0) {
          if (mods[dexIdx]![1] !== dexMod) {
            mods[dexIdx]![1] = dexMod
            ffChanged = true
          }
        } else {
          mods.push(['dex', dexMod])
          ffChanged = true
        }
      } else if (dexIdx >= 0) {
        mods.splice(dexIdx, 1)
        ffChanged = true
      }

      const newTotal = mods.reduce((sum, [, v]) => sum + v, 0)
      if (ffArr[0] !== newTotal) ffChanged = true

      if (ffChanged) {
        ffArr.length = 0
        ffArr.push(newTotal)
        for (const [k, v] of mods) {
          ffArr.push({ [k]: v })
        }
        hasChanges = true
      }
    }
  }

  // ACP: update from effective ACP
  if (defense.acp && Array.isArray(defense.acp) && effectiveAcp.value !== 0) {
    const acpArr = defense.acp as unknown[]
    if (acpArr.length >= 2) {
      const currentTotal = acpArr[0]
      if (currentTotal !== effectiveAcp.value) {
        // Rebuild in spread format with the dominating sources
        acpArr.length = 0
        acpArr.push(effectiveAcp.value)
        for (const [k, v] of Object.entries(effectiveAcp.sources)) {
          acpArr.push({ [k]: v })
        }
        hasChanges = true
      }
    }
  }

  // Max-dex: update from effective max-dex
  if (
    defense['max-dex'] &&
    Array.isArray(defense['max-dex']) &&
    effectiveMaxDex.value !== null
  ) {
    const mdArr = defense['max-dex'] as unknown[]
    if (mdArr.length >= 2) {
      const currentTotal = mdArr[0]
      if (currentTotal !== effectiveMaxDex.value) {
        mdArr.length = 0
        mdArr.push(effectiveMaxDex.value)
        for (const [k, v] of Object.entries(effectiveMaxDex.sources)) {
          mdArr.push({ [k]: v })
        }
        hasChanges = true
      }
    }
  }

  return hasChanges
}

function propagateToCarryingCapacity(
  data: { character?: Record<string, unknown> },
  abilities: Abilities,
  hasChanges: boolean,
): boolean {
  if (!data.character?.movement) return hasChanges
  const movement = data.character.movement as Record<string, unknown>
  if (!movement.capacity) return hasChanges
  if (!abilities.strength) return hasChanges

  let strengthScore: number | undefined
  if (Array.isArray(abilities.strength)) {
    strengthScore = abilities.strength[0]
  }
  if (typeof strengthScore !== 'number') return hasChanges

  // Official D&D 3.5e carrying capacity table for STR 1–29
  const heavyTable = [
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230, 260,
    300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400,
  ]
  let heavy = 10
  if (strengthScore >= 1 && strengthScore <= 29) {
    heavy = heavyTable[strengthScore - 1] ?? 10
  } else if (strengthScore >= 30) {
    const base = 400 // STR 20 heavy load
    const extra = strengthScore - 20
    const factor = Math.floor(extra / 10)
    heavy = base * Math.pow(2, factor)
    const remainder = extra % 10
    if (remainder > 0) {
      const nextHeavy = base * Math.pow(2, factor + 1)
      heavy = Math.floor(heavy + (nextHeavy - heavy) * (remainder / 10))
    }
  }
  const medium = Math.floor((2 * heavy) / 3)
  const light = Math.floor(heavy / 3)
  const lift = heavy * 2
  const drag = heavy * 5
  const cap = movement.capacity as Record<string, string>

  if (cap.light !== `${light} lbs`) {
    cap.light = `${light} lbs`
    hasChanges = true
  }
  if (cap.medium !== `${medium} lbs`) {
    cap.medium = `${medium} lbs`
    hasChanges = true
  }
  if (cap.heavy !== `${heavy} lbs`) {
    cap.heavy = `${heavy} lbs`
    hasChanges = true
  }
  if (cap.lift !== `${lift} lbs`) {
    cap.lift = `${lift} lbs`
    hasChanges = true
  }
  if (cap.drag !== `${drag} lbs`) {
    cap.drag = `${drag} lbs`
    hasChanges = true
  }

  return hasChanges
}

function propagateToMaxHp(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const levels = data.character?.levels as Record<string, unknown> | undefined
  if (!levels?.['max-hp'] || !Array.isArray(levels['max-hp'])) return hasChanges

  const conMod = abilityMods['con']
  if (conMod === undefined) return hasChanges

  const maxHpArr = levels['max-hp'] as unknown[]
  if (maxHpArr.length < 2) return hasChanges
  const maxHpMods = maxHpArr[1]
  if (!maxHpMods || typeof maxHpMods !== 'object' || Array.isArray(maxHpMods))
    return hasChanges
  const mods = maxHpMods as Record<string, unknown>

  // Count total HD from class entries
  const totalHd = countTotalHitDice(levels)

  // Derive con component: con_mod × total_HD
  const conHp = conMod * totalHd
  if (mods.con !== conHp) {
    ;(mods as Record<string, number>).con = conHp
    hasChanges = true
  }

  // Derive rolls: sum all hp arrays from class entries
  const totalRolls = sumClassHpRolls(levels)
  if (totalRolls > 0 && mods.rolls !== totalRolls) {
    ;(mods as Record<string, number>).rolls = totalRolls
    hasChanges = true
  }

  // Recalculate max-hp total
  const newMaxHp = sumValues(mods)
  if (maxHpArr[0] !== newMaxHp) {
    maxHpArr[0] = newMaxHp
    hasChanges = true
  }

  // Update current hp if it references max-hp
  if (
    hasChanges &&
    levels.hp &&
    Array.isArray(levels.hp) &&
    (levels.hp as unknown[]).length >= 2
  ) {
    const hpMods = (levels.hp as unknown[])[1]
    if (hpMods && typeof hpMods === 'object' && !Array.isArray(hpMods)) {
      const hpModObj = hpMods as Record<string, number>
      if ('max-hp' in hpModObj && hpModObj['max-hp'] !== maxHpArr[0]) {
        hpModObj['max-hp'] = maxHpArr[0] as number
        const newHp = sumValues(hpModObj)
        if ((levels.hp as unknown[])[0] !== newHp) {
          ;(levels.hp as unknown[])[0] = newHp
        }
      }
    }
  }

  return hasChanges
}

/**
 * Parse a class entry from the levels section.
 * New format: fighter: [3, hp: [10, 8, 7], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
 * Parses as: [3, {hp: [10, 8, 7]}, {hd: 10, bab: 'good', ...}]
 * Also supports old format: fighter: [3, {hd: 10, hp: [10, 8, 7]}]
 */
interface ClassEntry {
  level: number
  hpRolls: number[]
  classDef: Record<string, unknown> | null
}

function parseClassEntry(entry: unknown[]): ClassEntry | null {
  if (entry.length < 1 || typeof entry[0] !== 'number') return null
  const level = entry[0]
  let hpRolls: number[] = []
  let classDef: Record<string, unknown> | null = null

  for (let i = 1; i < entry.length; i++) {
    const el = entry[i]
    if (!el || typeof el !== 'object' || Array.isArray(el)) continue
    const obj = el as Record<string, unknown>

    // Check if this is an hp rolls entry: {hp: [rolls]}
    if ('hp' in obj && Array.isArray(obj.hp)) {
      hpRolls = (obj.hp as unknown[]).filter(
        (v): v is number => typeof v === 'number',
      )
    }
    // Check if this is a class definition: has hd, bab, etc.
    if ('hd' in obj || 'bab' in obj) {
      classDef = obj
    }
  }

  return { level, hpRolls, classDef }
}

const LEVELS_RESERVED_KEYS = ['xp', 'hd', 'hp', 'max-hp']

/**
 * Count total hit dice from class entries
 */
function countTotalHitDice(levels: Record<string, unknown>): number {
  let total = 0
  for (const [key, value] of Object.entries(levels)) {
    if (LEVELS_RESERVED_KEYS.includes(key)) continue
    if (!Array.isArray(value)) continue
    const entry = parseClassEntry(value)
    if (entry) total += entry.level
  }
  if (
    total === 0 &&
    levels.hd &&
    Array.isArray(levels.hd) &&
    typeof (levels.hd as unknown[])[0] === 'number'
  ) {
    return (levels.hd as number[])[0] ?? 0
  }
  return total
}

/**
 * Sum all HP rolls from class entries
 */
function sumClassHpRolls(levels: Record<string, unknown>): number {
  let total = 0
  for (const [key, value] of Object.entries(levels)) {
    if (LEVELS_RESERVED_KEYS.includes(key)) continue
    if (!Array.isArray(value)) continue
    const entry = parseClassEntry(value)
    if (entry) {
      for (const roll of entry.hpRolls) total += roll
    }
  }
  return total
}

/**
 * Derive BAB from class levels using progression rates defined in class entries
 */
function propagateToBab(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const levels = data.character?.levels as Record<string, unknown> | undefined
  const attack = (data.character?.combat as Record<string, unknown>)?.attack as
    | Record<string, unknown>
    | undefined
  if (!levels || !attack?.bab || !Array.isArray(attack.bab)) return hasChanges

  const babArr = attack.bab as unknown[]
  if (babArr.length < 2) return hasChanges
  const babMods = babArr[1]
  if (!babMods || typeof babMods !== 'object' || Array.isArray(babMods))
    return hasChanges
  const mods = babMods as Record<string, number>

  let changed = false
  let totalBab = 0

  for (const [className, classValue] of Object.entries(levels)) {
    if (LEVELS_RESERVED_KEYS.includes(className)) continue
    if (!Array.isArray(classValue)) continue
    const entry = parseClassEntry(classValue)
    if (!entry || !entry.classDef) continue

    const babProgression = entry.classDef.bab
    if (typeof babProgression !== 'string') continue

    const classBab = calculateBab(babProgression, entry.level)
    totalBab += classBab

    if (mods[className] !== classBab) {
      mods[className] = classBab
      changed = true
    }
  }

  if (changed) {
    babArr[0] = totalBab
    hasChanges = true
  }

  return hasChanges
}

// propagateBabToAttacks removed — componentBindings handle "bab" key propagation

/**
 * Derive base saves from class levels using progression rates defined in class entries
 */
function propagateToBaseSaves(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const levels = data.character?.levels as Record<string, unknown> | undefined
  const saves = (data.character?.combat as Record<string, unknown>)?.saves as
    | Record<string, unknown>
    | undefined
  if (!levels || !saves) return hasChanges

  const saveTypes: Array<{ name: string; saveKey: string }> = [
    { name: 'fortitude', saveKey: 'fort' },
    { name: 'reflex', saveKey: 'ref' },
    { name: 'will', saveKey: 'will' },
  ]

  for (const { name, saveKey } of saveTypes) {
    const saveArr = saves[name]
    if (!Array.isArray(saveArr) || saveArr.length < 2) continue
    const saveMods = saveArr[1]
    if (!saveMods || typeof saveMods !== 'object' || Array.isArray(saveMods))
      continue
    const mods = saveMods as Record<string, number>

    let changed = false

    for (const [className, classValue] of Object.entries(levels)) {
      if (LEVELS_RESERVED_KEYS.includes(className)) continue
      if (!Array.isArray(classValue)) continue
      const entry = parseClassEntry(classValue)
      if (!entry || !entry.classDef) continue

      const saveProgression = entry.classDef[saveKey]
      if (typeof saveProgression !== 'string') continue

      const baseSave = calculateBaseSave(saveProgression, entry.level)

      if (className in mods && mods[className] !== baseSave) {
        mods[className] = baseSave
        changed = true
      }
    }

    if (changed) {
      saveArr[0] = sumValues(mods)
      hasChanges = true
    }
  }

  return hasChanges
}

/**
 * Derive total hit dice from class entries
 * Updates levels.hd: [totalHD, largestDie]
 */
function propagateToHitDice(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const levels = data.character?.levels as Record<string, unknown> | undefined
  if (!levels?.hd || !Array.isArray(levels.hd)) return hasChanges

  const hdArr = levels.hd as unknown[]
  if (hdArr.length < 2) return hasChanges

  let totalHd = 0
  let largestDie = 0

  for (const [key, value] of Object.entries(levels)) {
    if (LEVELS_RESERVED_KEYS.includes(key)) continue
    if (!Array.isArray(value)) continue
    const entry = parseClassEntry(value)
    if (!entry) continue
    totalHd += entry.level

    if (entry.classDef && typeof entry.classDef.hd === 'number') {
      if (entry.classDef.hd > largestDie) {
        largestDie = entry.classDef.hd
      }
    }
  }

  if (totalHd > 0 && hdArr[0] !== totalHd) {
    hdArr[0] = totalHd
    hasChanges = true
  }
  // Only update hdArr[1] if it's a number (single-class simple format).
  // If it's a string (e.g., "6d8 + 3d10 + 4d6") or object (e.g., {cleric: 8, mystic-theurge: 4}),
  // preserve the user's format since we can't improve on it.
  if (
    largestDie > 0 &&
    typeof hdArr[1] === 'number' &&
    hdArr[1] !== largestDie
  ) {
    hdArr[1] = largestDie
    hasChanges = true
  }

  return hasChanges
}

/**
 * Calculate inventory weight from items in carried containers.
 * Updates movement.load: [total, {container1: weight, container2: weight}]
 */
function propagateToInventoryWeight(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const inventory = data.character?.inventory as
    | Record<string, unknown>
    | undefined
  const movement = data.character?.movement as
    | Record<string, unknown>
    | undefined
  if (!inventory || !movement?.load || !Array.isArray(movement.load))
    return hasChanges

  const loadArr = movement.load as unknown[]
  if (loadArr.length < 2) return hasChanges

  // Get the list of carried containers from _on
  const onList = inventory._on as string[] | undefined
  if (!onList || !Array.isArray(onList)) return hasChanges

  const containerWeights: Record<string, number> = {}
  let totalWeight = 0

  for (const containerName of onList) {
    const items = inventory[containerName] as unknown[][] | undefined
    if (!Array.isArray(items)) continue

    let containerWeight = 0
    for (const item of items) {
      if (!Array.isArray(item) || item.length < 4) continue
      const qty = item[1]
      const weightStr = item[3]
      if (typeof qty !== 'number' || typeof weightStr !== 'string') continue

      const weightMatch = weightStr.match(/^([0-9.]+)/)
      if (weightMatch) {
        containerWeight += qty * parseFloat(weightMatch[1]!)
      }
    }

    // Also add money weight if coins are in this container
    if (inventory.money && typeof inventory.money === 'object') {
      const money = inventory.money as Record<string, unknown>
      if (money.coins && Array.isArray(money.coins)) {
        const coins = money.coins as unknown[]
        // coins: [value, weight, location, breakdown, weightPerCoin]
        if (coins.length >= 3 && coins[2] === containerName) {
          const coinWeightStr = coins[1]
          if (typeof coinWeightStr === 'string') {
            const coinMatch = coinWeightStr.match(/^([0-9.]+)/)
            if (coinMatch) {
              containerWeight += parseFloat(coinMatch[1]!)
            }
          }
        }
      }
    }

    // Round to 1 decimal place to avoid floating point issues
    containerWeight = Math.round(containerWeight * 10) / 10
    containerWeights[containerName] = containerWeight
    totalWeight += containerWeight
  }

  totalWeight = Math.round(totalWeight * 10) / 10

  // Update the load array
  const loadMods = loadArr[1]
  if (!loadMods || typeof loadMods !== 'object' || Array.isArray(loadMods))
    return hasChanges
  const mods = loadMods as Record<string, string>

  let changed = false
  const newTotalStr = `${totalWeight} lbs`
  if (loadArr[0] !== newTotalStr) {
    loadArr[0] = newTotalStr
    changed = true
  }

  for (const [container, weight] of Object.entries(containerWeights)) {
    const weightStr = `${weight} lbs`
    if (mods[container] !== weightStr) {
      mods[container] = weightStr
      changed = true
    }
  }

  if (changed) hasChanges = true
  return hasChanges
}

// Synergy bonus pairs: [sourceSkill, minRanks, targetSkill, bonus]
// Only unconditional synergies are listed here
const SYNERGY_BONUSES: Array<[string, number, string, number]> = [
  // Bluff synergies
  ['bluff', 5, 'diplomacy', 2],
  ['bluff', 5, 'intimidate', 2],
  ['bluff', 5, 'sleight-of-hand', 2],
  // Sense Motive synergy
  ['sense-motive', 5, 'diplomacy', 2],
  // Tumble synergies
  ['tumble', 5, 'balance', 2],
  ['tumble', 5, 'jump', 2],
  // Jump synergy
  ['jump', 5, 'tumble', 2],
  // Use Rope synergies
  ['use-rope', 5, 'climb', 2],
  ['use-rope', 5, 'escape-artist', 2],
  // Escape Artist synergy
  ['escape-artist', 5, 'use-rope', 2],
  // Knowledge synergies
  ['knowledge-arcana', 5, 'spellcraft', 2],
  ['knowledge-local', 5, 'gather-information', 2],
  ['knowledge-nobility', 5, 'diplomacy', 2],
  // Search/Survival synergies
  ['search', 5, 'survival', 2],
  ['survival', 5, 'knowledge-nature', 2],
  // Handle Animal synergy
  ['handle-animal', 5, 'ride', 2],
  // Spellcraft synergy
  ['spellcraft', 5, 'use-magic-device', 2],
  // Concentration — no unconditional synergies
  // Decipher Script synergy
  ['decipher-script', 5, 'use-magic-device', 2],
]

function propagateToSynergy(
  data: { character?: Record<string, unknown> },
  hasChanges: boolean,
): boolean {
  const skills = data.character?.skills as Record<string, unknown> | undefined
  if (!skills) return hasChanges

  // Build a map of skill ranks
  const rankMap: Record<string, number> = {}
  for (const [skillName, skillArr] of Object.entries(skills)) {
    if (!Array.isArray(skillArr) || skillArr.length < 2) continue
    const mods = skillArr[1]
    if (!mods || typeof mods !== 'object' || Array.isArray(mods)) continue
    const modsObj = mods as Record<string, number>
    if ('ranks' in modsObj && typeof modsObj.ranks === 'number') {
      rankMap[skillName] = modsObj.ranks
    }
  }

  // Apply synergy bonuses
  for (const [source, minRanks, target, bonus] of SYNERGY_BONUSES) {
    const sourceRanks = rankMap[source] ?? 0
    const targetArr = skills[target]
    if (!Array.isArray(targetArr) || targetArr.length < 2) continue
    const targetMods = targetArr[1]
    if (
      !targetMods ||
      typeof targetMods !== 'object' ||
      Array.isArray(targetMods)
    )
      continue
    const modsObj = targetMods as Record<string, number>

    const synergyKey = `synergy-${source}`
    // Check if user already has this synergy under a different naming convention
    // e.g., "tumble-synergy" instead of "synergy-tumble", or "knowledge-arcana-synergy"
    const altKey = `${source}-synergy`
    const hasExistingSynergy = altKey in modsObj
    if (sourceRanks >= minRanks) {
      // Only add our synergy key if user hasn't already provided one
      if (!hasExistingSynergy) {
        if (modsObj[synergyKey] !== bonus) {
          modsObj[synergyKey] = bonus
          targetArr[0] = sumValues(modsObj)
          hasChanges = true
        }
      }
    } else if (synergyKey in modsObj) {
      delete modsObj[synergyKey]
      targetArr[0] = sumValues(modsObj)
      hasChanges = true
    }
  }

  return hasChanges
}

function propagateToSpeed(
  data: { character?: Record<string, unknown> },
  equipStats: EquipmentStats,
  loadEffects: LoadEffects,
  hasChanges: boolean,
): boolean {
  const movement = data.character?.movement as
    | Record<string, unknown>
    | undefined
  if (!movement?.speed || !Array.isArray(movement.speed)) return hasChanges

  const speedArr = movement.speed as unknown[]
  if (speedArr.length < 2) return hasChanges
  const mods = speedArr[1]
  if (!mods || typeof mods !== 'object' || Array.isArray(mods))
    return hasChanges
  const modsObj = mods as Record<string, number>

  const baseSpeed = modsObj.base
  if (typeof baseSpeed !== 'number') return hasChanges

  // Determine speed reduction: use the worse of armor or load
  // Medium/heavy armor or medium/heavy load: 30ft→20ft (-10), 20ft→15ft (-5)
  const speedRed30 = baseSpeed >= 30 ? -10 : -5

  const armorReduces =
    equipStats.armorCategory === 'medium' ||
    equipStats.armorCategory === 'heavy'
  const loadReduces =
    loadEffects.category === 'medium' || loadEffects.category === 'heavy'

  // Determine which source to show — armor or load (whichever applies; if both, either works)
  let reductionKey: string | null = null
  let reduction = 0

  if (armorReduces && loadReduces) {
    // Both reduce — show the load source (convention: pick one)
    reductionKey = `${loadEffects.category}-load`
    reduction = speedRed30
  } else if (loadReduces) {
    reductionKey = `${loadEffects.category}-load`
    reduction = speedRed30
  } else if (armorReduces) {
    reductionKey = `${equipStats.armorCategory}-armor`
    reduction = speedRed30
  }

  // Check for user-specified speed reduction keys (e.g., "heavy-armor: -10")
  // These may not match our computed key format exactly, so detect them
  const existingReductionKeys = Object.keys(modsObj).filter(
    (k) => k.endsWith('-load') || k.endsWith('-armor'),
  )

  // If user already has a speed reduction key, don't override it unless
  // we have computed a different reduction source
  if (existingReductionKeys.length > 0 && !reductionKey) {
    // User has a reduction but we computed none — trust the user
    return hasChanges
  }

  // Remove old speed reduction keys and apply new one
  let changed = false
  for (const k of existingReductionKeys) {
    if (k !== reductionKey) {
      delete modsObj[k]
      changed = true
    }
  }

  if (reductionKey && reduction !== 0) {
    if (modsObj[reductionKey] !== reduction) {
      modsObj[reductionKey] = reduction
      changed = true
    }
  }

  if (changed) {
    speedArr[0] = sumValues(modsObj)
    hasChanges = true
  }

  return hasChanges
}

/**
 * D&D 3.5e bonus spell slots formula:
 * For spell level N (1+), bonus = floor((mod - N) / 4) + 1 if mod >= N, else 0.
 * Level 0 spells never get bonus slots.
 */
function bonusSpellSlots(abilityMod: number, spellLevel: number): number {
  if (spellLevel <= 0 || abilityMod < spellLevel) return 0
  return Math.floor((abilityMod - spellLevel) / 4) + 1
}

/**
 * Propagate casting stat modifier to spell slot calculations.
 * Each class under spells has: casting: [type, stat], slots: {level: [total, {class: N, stat: N, ...}]}
 */
function propagateToSpellSlots(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const spells = data.character?.spells as Record<string, unknown> | undefined
  if (!spells) return hasChanges

  for (const [className, classSpells] of Object.entries(spells)) {
    if (
      !classSpells ||
      typeof classSpells !== 'object' ||
      Array.isArray(classSpells)
    )
      continue
    const spellBlock = classSpells as Record<string, unknown>

    // Read casting info: [type, stat] e.g. [prepared, int]
    const casting = spellBlock.casting as unknown[]
    if (!Array.isArray(casting) || casting.length < 2) continue
    const castingStat = casting[1] as string
    const statMod = abilityMods[castingStat]
    if (statMod === undefined) continue

    // Update slots
    const slots = spellBlock.slots as Record<string, unknown> | undefined
    if (!slots || typeof slots !== 'object') continue

    for (const [levelStr, slotArr] of Object.entries(slots)) {
      if (!Array.isArray(slotArr) || slotArr.length < 2) continue
      const spellLevel = parseInt(levelStr, 10)
      if (isNaN(spellLevel)) continue

      // Get the modifiers object (position 1)
      const mods = slotArr[1]
      if (!mods || typeof mods !== 'object' || Array.isArray(mods)) continue
      const modsObj = mods as Record<string, number>

      // Calculate bonus slots for this spell level
      const bonus = bonusSpellSlots(statMod, spellLevel)

      // Update the casting stat key in the modifiers
      if (castingStat in modsObj && modsObj[castingStat] !== bonus) {
        modsObj[castingStat] = bonus
        slotArr[0] = sumValues(modsObj)
        hasChanges = true
      }
    }

    // Validate prepared count against slot count
    const prepared = spellBlock.prepared as Record<string, unknown> | undefined
    if (prepared && slots) {
      for (const [levelStr, prepList] of Object.entries(prepared)) {
        if (!Array.isArray(prepList)) continue
        const slotArr = (slots as Record<string, unknown>)[levelStr]
        if (!Array.isArray(slotArr)) continue
        const totalSlots = slotArr[0]
        if (typeof totalSlots === 'number' && prepList.length > totalSlots) {
          // Over-prepared: we could warn, but for now just note it
          // Future: add warnings/errors to output
        }
      }
    }
  }

  return hasChanges
}

function calculateAbilityScores(
  character: Character,
  hasChanges: boolean,
  rootData: unknown,
  schema?: import('./schemaLoader').Schema,
) {
  if (!schema) schema = loadSchema('dnd35-character')

  for (const [abilityName, abilityArr] of Object.entries(character.abilities)) {
    if (Array.isArray(abilityArr)) {
      const [currentScore, modifierData, calculationDetails] = abilityArr

      let totalScore = currentScore || 0

      if (calculationDetails && typeof calculationDetails === 'object') {
        const scoreType = getAbilityArrayType(schema, abilityName, 0)

        if (scoreType) {
          const calculatedScore = calculateFieldValue(
            schema,
            scoreType,
            abilityArr,
            0,
            rootData,
            ['character', 'abilities', abilityName],
          )
          if (
            calculatedScore !== undefined &&
            calculatedScore !== currentScore
          ) {
            totalScore = calculatedScore
            abilityArr[0] = totalScore
            hasChanges = true
          }
        } else {
          if (typeof calculationDetails.base === 'number') {
            totalScore = sumOfValues(calculationDetails)
            if (currentScore !== totalScore) {
              abilityArr[0] = totalScore
              hasChanges = true
            }
          }
        }
      }

      const modifierType = getAbilityArrayType(schema, abilityName, 1)
      if (modifierType) {
        const calculatedModifier = calculateFieldValue(
          schema,
          modifierType,
          abilityArr,
          1,
          rootData,
          ['character', 'abilities', abilityName],
        )

        if (
          calculatedModifier !== undefined &&
          typeof modifierData === 'object' &&
          modifierData !== null
        ) {
          const firstKey = Object.keys(modifierData)[0]
          if (firstKey && modifierData[firstKey] !== calculatedModifier) {
            abilityArr[1] = { [firstKey]: calculatedModifier }
            hasChanges = true
          }
        }
      }
    }
  }
  return hasChanges
}

function sumOfValues(obj: Record<string, number>): number {
  return Object.values(obj).reduce((sum, val) => sum + val, 0)
}
