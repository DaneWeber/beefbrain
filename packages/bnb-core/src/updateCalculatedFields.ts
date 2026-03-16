import { parse as parseYAML } from 'yaml'
import { dataToCompactYAML } from './dataToCompactYAML'
import type { Character, Abilities } from '.'
import { loadSchema } from './schemaLoader'
import { calculateFieldValue, getAbilityArrayType } from './calculationEngine'

// Maps ability name to its abbreviation used in modifier objects
const ABILITY_ABBR: Record<string, string> = {
  strength: 'str',
  dexterity: 'dex',
  constitution: 'con',
  intelligence: 'int',
  wisdom: 'wis',
  charisma: 'cha',
}

// Skills keyed by their primary ability abbreviation
const SKILL_ABILITIES: Record<string, string> = {
  appraise: 'int',
  balance: 'dex',
  bluff: 'cha',
  climb: 'str',
  concentration: 'con',
  craft: 'int',
  'decipher-script': 'int',
  diplomacy: 'cha',
  'disable-device': 'int',
  disguise: 'cha',
  'escape-artist': 'dex',
  forgery: 'int',
  'gather-information': 'cha',
  'handle-animal': 'cha',
  heal: 'wis',
  hide: 'dex',
  intimidate: 'cha',
  jump: 'str',
  listen: 'wis',
  'move-silently': 'dex',
  'open-lock': 'dex',
  ride: 'dex',
  search: 'int',
  'sense-motive': 'wis',
  'sleight-of-hand': 'dex',
  spellcraft: 'int',
  spot: 'wis',
  survival: 'wis',
  swim: 'str',
  tumble: 'dex',
  'use-magic-device': 'cha',
  'use-rope': 'dex',
}

// Save mapping keyed by ability abbreviation
const SAVE_ABILITIES: Record<string, string> = {
  fortitude: 'con',
  reflex: 'dex',
  will: 'wis',
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

  // Step 1: Calculate ability scores and modifiers
  hasChanges = calculateAbilityScores(character, hasChanges, data)

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
  const effectiveMaxDex = calculateEffectiveMaxDex(equipStats, updatedLoadEffects)

  // Step 6: Propagate ability modifiers to all dependent fields
  hasChanges = propagateToSkills(data, abilityMods, effectiveAcp, hasChanges)
  hasChanges = propagateToSaves(data, abilityMods, hasChanges)
  hasChanges = propagateToInitiative(data, abilityMods, hasChanges)
  hasChanges = propagateToMeleeAttacks(data, abilityMods, hasChanges)
  hasChanges = propagateToRangedAttacks(data, abilityMods, hasChanges)
  hasChanges = propagateToGrapple(data, abilityMods, hasChanges)
  hasChanges = propagateToDefense(data, abilityMods, equipStats, effectiveMaxDex, effectiveAcp, hasChanges)
  hasChanges = propagateToMaxHp(data, abilityMods, hasChanges)

  if (hasChanges) {
    return dataToCompactYAML(data)
  }
  return yamlContent
}

/**
 * Read equipment stats from equipped inventory items
 */
function readEquipmentStats(data: { character?: Record<string, unknown> }): EquipmentStats {
  const result: EquipmentStats = {
    armorAc: 0,
    shieldAc: 0,
    armorAcp: 0,
    shieldAcp: 0,
    armorMaxDex: null,
  }

  const inventory = data.character?.inventory as Record<string, unknown> | undefined
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
        if (typeof props['max-dex'] === 'number') result.armorMaxDex = props['max-dex']
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
function determineLoadCategory(data: { character?: Record<string, unknown> }): LoadEffects {
  const defaultEffects: LoadEffects = {
    category: 'unknown',
    maxDex: null,
    acp: 0,
    speedReduction30: 0,
    speedReduction20: 0,
  }

  const movement = data.character?.movement as Record<string, unknown> | undefined
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
    return { category: 'light', maxDex: null, acp: 0, speedReduction30: 0, speedReduction20: 0 }
  } else if (currentWeight <= mediumMax) {
    return { category: 'medium', maxDex: 3, acp: -3, speedReduction30: -10, speedReduction20: -5 }
  } else {
    return { category: 'heavy', maxDex: 1, acp: -6, speedReduction30: -10, speedReduction20: -5 }
  }
}

function calculateEffectiveAcp(equip: EquipmentStats, load: LoadEffects): { value: number, sources: Record<string, number> } {
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

function calculateEffectiveMaxDex(equip: EquipmentStats, load: LoadEffects): { value: number | null, sources: Record<string, number> } {
  const armorMax = equip.armorMaxDex
  const loadMax = load.maxDex

  if (armorMax !== null && loadMax !== null) {
    // Both apply — use the worse (lower)
    if (armorMax <= loadMax) {
      return { value: armorMax, sources: { 'armor': armorMax } }
    } else {
      const categoryKey = `${load.category}-load`
      return { value: loadMax, sources: { [categoryKey]: loadMax } }
    }
  } else if (armorMax !== null) {
    return { value: armorMax, sources: { 'armor': armorMax } }
  } else if (loadMax !== null) {
    const categoryKey = `${load.category}-load`
    return { value: loadMax, sources: { [categoryKey]: loadMax } }
  }

  return { value: null, sources: {} }
}

/**
 * Get the current modifier value for each ability from the parsed data
 */
function getAbilityModifiers(
  abilities: Abilities,
): Record<string, number> {
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

function sumValues(obj: Record<string, unknown>): number {
  let sum = 0
  for (const v of Object.values(obj)) {
    if (typeof v === 'number') sum += v
  }
  return sum
}

// --- Propagation functions ---

// Skills that take ACP
const ACP_SKILLS = new Set([
  'balance', 'climb', 'escape-artist', 'hide', 'jump',
  'move-silently', 'sleight-of-hand', 'tumble',
])
// Swim takes double ACP
const DOUBLE_ACP_SKILLS = new Set(['swim'])

function propagateToSkills(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  effectiveAcp: { value: number, sources: Record<string, number> },
  hasChanges: boolean,
): boolean {
  const skills = data.character?.skills as
    | Record<string, unknown>
    | undefined
  if (!skills) return hasChanges

  for (const [skillName, skillArr] of Object.entries(skills)) {
    if (!Array.isArray(skillArr) || skillArr.length < 2) continue
    const mods = skillArr[1]
    if (!mods || typeof mods !== 'object' || Array.isArray(mods)) continue

    const modsObj = mods as Record<string, number>

    // Determine which ability this skill uses
    const knownAbility = SKILL_ABILITIES[skillName]
    const baseSkill = skillName.split('-')[0]
    let abbrKey: string | undefined

    if (knownAbility) {
      abbrKey = knownAbility
    } else if (baseSkill === 'perform') {
      abbrKey = 'cha'
    } else if (baseSkill === 'craft') {
      abbrKey = 'int'
    } else if (baseSkill === 'knowledge') {
      abbrKey = 'int'
    } else if (baseSkill === 'profession') {
      abbrKey = 'wis'
    } else {
      for (const abbr of Object.values(ABILITY_ABBR)) {
        if (abbr in modsObj) {
          abbrKey = abbr
          break
        }
      }
    }

    if (abbrKey && abbrKey in abilityMods) {
      if (updateModifierArray(skillArr, abbrKey, abilityMods[abbrKey]!)) {
        hasChanges = true
      }
    }

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

function propagateToSaves(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const saves = (data.character?.combat as Record<string, unknown>)
    ?.saves as Record<string, unknown> | undefined
  if (!saves) return hasChanges

  for (const [saveName, saveArr] of Object.entries(saves)) {
    if (!Array.isArray(saveArr) || saveArr.length < 2) continue
    const abbrKey = SAVE_ABILITIES[saveName]
    if (abbrKey && abbrKey in abilityMods) {
      if (updateModifierArray(saveArr, abbrKey, abilityMods[abbrKey]!)) {
        hasChanges = true
      }
    }
  }
  return hasChanges
}

function propagateToInitiative(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const combat = data.character?.combat as Record<string, unknown> | undefined
  if (!combat?.initiative) return hasChanges
  const initArr = combat.initiative as unknown[]
  if (updateModifierArray(initArr, 'dex', abilityMods['dex'] ?? 0)) {
    hasChanges = true
  }
  return hasChanges
}

function propagateToMeleeAttacks(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const attack = (data.character?.combat as Record<string, unknown>)
    ?.attack as Record<string, unknown> | undefined
  if (!attack?.melee) return hasChanges

  const melee = attack.melee as Record<string, unknown>
  const strMod = abilityMods['str']
  if (strMod === undefined) return hasChanges

  // Update generic melee attack: _: [total, {bab: n, str: n}, [...]]
  if (melee._ && Array.isArray(melee._)) {
    if (updateModifierArray(melee._ as unknown[], 'str', strMod)) {
      hasChanges = true
    }
  }

  // Update named melee weapons
  for (const [weaponName, weaponArr] of Object.entries(melee)) {
    if (weaponName === '_') continue
    if (!Array.isArray(weaponArr) || weaponArr.length < 5) continue

    // weaponArr[4] is the str modifier object: {str: n}
    const strObj = weaponArr[4]
    if (strObj && typeof strObj === 'object' && 'str' in strObj) {
      if ((strObj as Record<string, number>).str !== strMod) {
        ;(strObj as Record<string, number>).str = strMod
        hasChanges = true
      }
    }

    // Propagate generic melee bonus to weaponArr[3]._
    if (melee._ && Array.isArray(melee._) && typeof (melee._ as unknown[])[0] === 'number') {
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
      const newDamage = weaponArr[1].replace(
        /(\d+d\d+)\+[0-9]+/,
        `$1+${strMod}`,
      )
      if (newDamage !== weaponArr[1]) {
        weaponArr[1] = newDamage
        hasChanges = true
      }
    }
  }
  return hasChanges
}

function propagateToRangedAttacks(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const attack = (data.character?.combat as Record<string, unknown>)
    ?.attack as Record<string, unknown> | undefined
  if (!attack?.ranged) return hasChanges

  const ranged = attack.ranged as Record<string, unknown>
  const dexMod = abilityMods['dex']
  if (dexMod === undefined) return hasChanges

  // Update generic ranged attack
  if (ranged._ && Array.isArray(ranged._)) {
    if (updateModifierArray(ranged._ as unknown[], 'dex', dexMod)) {
      hasChanges = true
    }
  }

  // Update named ranged weapons
  for (const [weaponName, weaponArr] of Object.entries(ranged)) {
    if (weaponName === '_') continue
    if (!Array.isArray(weaponArr) || weaponArr.length < 4) continue

    // Propagate generic ranged bonus to weaponArr[3]._
    if (ranged._ && Array.isArray(ranged._) && typeof (ranged._ as unknown[])[0] === 'number') {
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

function propagateToGrapple(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  hasChanges: boolean,
): boolean {
  const attack = (data.character?.combat as Record<string, unknown>)
    ?.attack as Record<string, unknown> | undefined
  if (!attack?.grapple || !Array.isArray(attack.grapple)) return hasChanges

  const strMod = abilityMods['str']
  if (strMod === undefined) return hasChanges

  if (updateModifierArray(attack.grapple as unknown[], 'str', strMod)) {
    hasChanges = true
  }
  return hasChanges
}

function propagateToDefense(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
  equipStats: EquipmentStats,
  effectiveMaxDex: { value: number | null, sources: Record<string, number> },
  effectiveAcp: { value: number, sources: Record<string, number> },
  hasChanges: boolean,
): boolean {
  const defense = (data.character?.combat as Record<string, unknown>)
    ?.defense as Record<string, unknown> | undefined
  if (!defense) return hasChanges

  const dexMod = abilityMods['dex'] ?? 0

  // Cap dex mod by effective max-dex for AC purposes
  const dexForAc = effectiveMaxDex.value !== null
    ? Math.min(dexMod, effectiveMaxDex.value)
    : dexMod

  // AC: [total, {base: 10, armor: N, shield: N, dex: n, ...}]
  if (defense.ac && Array.isArray(defense.ac)) {
    const acArr = defense.ac as unknown[]
    if (acArr.length >= 2 && typeof acArr[1] === 'object' && !Array.isArray(acArr[1])) {
      const mods = acArr[1] as Record<string, number>
      let changed = false

      // Update dex (capped)
      if (mods.dex !== dexForAc) { mods.dex = dexForAc; changed = true }

      // Update armor bonus from equipment
      if (equipStats.armorAc > 0) {
        if (mods.armor !== equipStats.armorAc) { mods.armor = equipStats.armorAc; changed = true }
      }
      if (equipStats.shieldAc > 0) {
        if (mods.shield !== equipStats.shieldAc) { mods.shield = equipStats.shieldAc; changed = true }
      }

      if (changed) {
        acArr[0] = sumValues(mods)
        hasChanges = true
      }
    }
  }

  // Touch AC: [total, {base: 10, dex: n, ...}] — no armor, shield, or natural armor
  if (defense['touch-ac'] && Array.isArray(defense['touch-ac'])) {
    if (updateModifierArray(defense['touch-ac'] as unknown[], 'dex', dexForAc)) {
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
          if (armorEntry[1] !== equipStats.armorAc) { armorEntry[1] = equipStats.armorAc; ffChanged = true }
        } else {
          mods.push(['armor', equipStats.armorAc])
          ffChanged = true
        }
      }
      if (equipStats.shieldAc > 0) {
        const shieldEntry = mods.find(([k]) => k === 'shield')
        if (shieldEntry) {
          if (shieldEntry[1] !== equipStats.shieldAc) { shieldEntry[1] = equipStats.shieldAc; ffChanged = true }
        } else {
          mods.push(['shield', equipStats.shieldAc])
          ffChanged = true
        }
      }

      // Apply dex rule: include only if negative
      const dexIdx = mods.findIndex(([k]) => k === 'dex')
      if (dexMod < 0) {
        if (dexIdx >= 0) {
          if (mods[dexIdx]![1] !== dexMod) { mods[dexIdx]![1] = dexMod; ffChanged = true }
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
  if (defense['max-dex'] && Array.isArray(defense['max-dex']) && effectiveMaxDex.value !== null) {
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
    10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230,
    260, 300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400,
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

  if (cap.light !== `${light} lbs`) { cap.light = `${light} lbs`; hasChanges = true }
  if (cap.medium !== `${medium} lbs`) { cap.medium = `${medium} lbs`; hasChanges = true }
  if (cap.heavy !== `${heavy} lbs`) { cap.heavy = `${heavy} lbs`; hasChanges = true }
  if (cap.lift !== `${lift} lbs`) { cap.lift = `${lift} lbs`; hasChanges = true }
  if (cap.drag !== `${drag} lbs`) { cap.drag = `${drag} lbs`; hasChanges = true }

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
  if (updateModifierArray(maxHpArr, 'con', conMod)) {
    hasChanges = true
    // Also update hp if it references max-hp
    if (levels.hp && Array.isArray(levels.hp) && (levels.hp as unknown[]).length >= 2) {
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
  }
  return hasChanges
}

function calculateAbilityScores(
  character: Character,
  hasChanges: boolean,
  rootData: unknown,
) {
  const schema = loadSchema('dnd35-character')

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
