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

  // Step 3: Propagate ability modifiers to all dependent fields
  hasChanges = propagateToSkills(data, abilityMods, hasChanges)
  hasChanges = propagateToSaves(data, abilityMods, hasChanges)
  hasChanges = propagateToInitiative(data, abilityMods, hasChanges)
  hasChanges = propagateToMeleeAttacks(data, abilityMods, hasChanges)
  hasChanges = propagateToRangedAttacks(data, abilityMods, hasChanges)
  hasChanges = propagateToGrapple(data, abilityMods, hasChanges)
  hasChanges = propagateToDefense(data, abilityMods, hasChanges)
  hasChanges = propagateToCarryingCapacity(data, abilities, hasChanges)
  hasChanges = propagateToMaxHp(data, abilityMods, hasChanges)

  if (hasChanges) {
    return dataToCompactYAML(data)
  }
  return yamlContent
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

function propagateToSkills(
  data: { character?: Record<string, unknown> },
  abilityMods: Record<string, number>,
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

    // Determine which ability this skill uses
    const knownAbility = SKILL_ABILITIES[skillName]
    // Also check for perform-* and craft-* and knowledge-* patterns
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
      // Check if the modifier object has any ability key
      for (const abbr of Object.values(ABILITY_ABBR)) {
        if (abbr in (mods as Record<string, unknown>)) {
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
  hasChanges: boolean,
): boolean {
  const defense = (data.character?.combat as Record<string, unknown>)
    ?.defense as Record<string, unknown> | undefined
  if (!defense) return hasChanges

  const dexMod = abilityMods['dex']
  if (dexMod === undefined) return hasChanges

  // AC: [total, {base: 10, dex: n, ...}]
  if (defense.ac && Array.isArray(defense.ac)) {
    if (updateModifierArray(defense.ac as unknown[], 'dex', dexMod)) {
      hasChanges = true
    }
  }

  // Touch AC: [total, {base: 10, dex: n, ...}]
  if (defense['touch-ac'] && Array.isArray(defense['touch-ac'])) {
    if (
      updateModifierArray(
        defense['touch-ac'] as unknown[],
        'dex',
        dexMod,
      )
    ) {
      hasChanges = true
    }
  }

  // Flat-footed AC: include dex only if negative, omit if positive
  // Note: YAML may parse [6, base: 10, dex: -4] as [6, {base: 10}, {dex: -4}]
  // so we need to handle both merged and spread modifier objects
  if (defense['flat-footed-ac'] && Array.isArray(defense['flat-footed-ac'])) {
    const ffArr = defense['flat-footed-ac'] as unknown[]
    if (ffArr.length >= 2) {
      // Merge all modifier objects from positions 1+ into a single map
      const merged: Record<string, number> = {}
      for (let i = 1; i < ffArr.length; i++) {
        const el = ffArr[i]
        if (el && typeof el === 'object' && !Array.isArray(el)) {
          for (const [k, v] of Object.entries(el as Record<string, unknown>)) {
            if (typeof v === 'number') merged[k] = v
          }
        }
      }

      if (dexMod < 0) {
        if (merged['dex'] !== dexMod) {
          merged['dex'] = dexMod
          hasChanges = true
        }
      } else {
        if ('dex' in merged) {
          delete merged['dex']
          hasChanges = true
        }
      }

      // Recalculate total and rebuild array as [total, {merged}]
      const newTotal = sumValues(merged)
      if (ffArr[0] !== newTotal || ffArr.length > 2 || hasChanges) {
        ffArr[0] = newTotal
        ffArr[1] = { ...merged }
        // Remove extra elements (from spread format)
        ffArr.length = 2
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
