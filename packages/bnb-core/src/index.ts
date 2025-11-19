import { parse as parseYAML, Document, YAMLSeq, YAMLMap } from 'yaml'
import { validateBeefBrainData } from './validateBeefBrainData'

/**
 * Beef Brain Core Library
 *
 * The library that powers the human-readable data formats for TTRPG character and creature calculation.
 *
 * @public
 */

// Type definitions

type CalculationDetails = {
  base: number
  [key: string]: number
}

type ModifierData = {
  [key: string]: number
}

type AbilityData = [number, ModifierData, CalculationDetails]

type Abilities = {
  [abilityName: string]: AbilityData
}

type Character = {
  abilities: Abilities
  skills?: Record<string, [number, Record<string, number>]>
  combat?: any
}

type BeefBrainData = {
  character?: Character
}

// Paths to apply flow style (wildcards supported for arrays)
const flowStylePaths = [
  'character.abilities.*',
  'character.levels.*',
  'character.combat.initiative',
  'character.combat.saves.*',
  'character.combat.attack.bab',
  'character.combat.attack.grapple',
  'character.combat.attack.melee.*',
  'character.combat.attack.ranged.*',
  'character.combat.defense.*',
  'character.movement.*',
  'character.movement.capacity',
  'character.skills.*',
  'character.special.feats.*',
  'character.inventory._on',
  'character.inventory.*.*',
]

export { validateBeefBrainData }

function setSelectiveFlowStyle(node: unknown, path: string[] = []) {
  const pathStr = path.join('.')
  for (const pattern of flowStylePaths) {
    const patternParts = pattern.split('.')
    const pathParts = path
    if (
      patternParts.length === pathParts.length &&
      patternParts.every((part, i) => part === '*' || part === pathParts[i])
    ) {
      if (node instanceof YAMLSeq || node instanceof YAMLMap) {
        node.flow = true
      }
      break
    }
  }
  if (node instanceof YAMLSeq) {
    node.items.forEach((item, idx) =>
      setSelectiveFlowStyle(item, [...path, idx.toString()]),
    )
  } else if (node instanceof YAMLMap) {
    node.items.forEach((item) => {
      if (item && item.key && item.value) {
        setSelectiveFlowStyle(item.value, [...path, String(item.key)])
      }
    })
  }
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
  const abilities = data.character?.abilities || {}
  // Dexterity modifier propagation logic (always recalculate and propagate)
  let dexMod: number | undefined
  if (abilities.dexterity && Array.isArray(abilities.dexterity)) {
    const score = abilities.dexterity[0]
    if (typeof score === 'number') {
      dexMod = Math.floor((score - 10) / 2)
    }
  }
  if (typeof dexMod === 'number') {
    // Propagate dex modifier to all combat fields with a 'dex' key
    const propagateDex = (arr: any) => {
      if (arr && Array.isArray(arr) && arr.length >= 2) {
        const [currentValue, modifiers] = arr as [
          number,
          Record<string, number>,
        ]
        if (modifiers && typeof modifiers === 'object' && 'dex' in modifiers) {
          // Always overwrite dex with recalculated value
          modifiers.dex = dexMod
          hasChanges = true
          let newValue = 0
          for (const value of Object.values(modifiers)) {
            newValue += typeof value === 'number' ? value : 0
          }
          if (currentValue !== newValue) {
            arr[0] = newValue
            hasChanges = true
          }
        }
      }
    }
    if (data.character?.combat) {
      // Saves
      Object.values(data.character.combat.saves || {}).forEach(propagateDex)
      // Initiative
      propagateDex(data.character.combat.initiative)
      // Defense
      Object.values(data.character.combat.defense || {}).forEach(propagateDex)
    }
    // Propagate dex modifier to all skills with a 'dex' key
    if (data.character?.skills) {
      Object.values(data.character.skills).forEach((skillArr: any) => {
        if (Array.isArray(skillArr) && skillArr.length >= 2) {
          const modifiers = skillArr[1]
          if (
            modifiers &&
            typeof modifiers === 'object' &&
            'dex' in modifiers
          ) {
            if (modifiers.dex !== dexMod) {
              modifiers.dex = dexMod
              hasChanges = true
            }
            let newValue = 0
            for (const value of Object.values(modifiers)) {
              newValue += typeof value === 'number' ? value : 0
            }
            if (skillArr[0] !== newValue) {
              skillArr[0] = newValue
              hasChanges = true
            }
          }
        }
      })
    }
  }
  // Movement carrying capacity update logic
  if (data.character?.movement?.capacity && abilities.strength) {
    let strengthScore: number | undefined
    if (Array.isArray(abilities.strength)) {
      strengthScore = abilities.strength[0]
    }
    if (typeof strengthScore === 'number') {
      // Official D&D 3.5e carrying capacity table for STR 1–29
      const heavyTable = [
        10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 115, 130, 150, 175, 200, 230,
        260, 300, 350, 400, 460, 520, 600, 700, 800, 920, 1040, 1200, 1400,
      ]
      let heavy = 10
      if (strengthScore >= 1 && strengthScore <= 29) {
        heavy = heavyTable[strengthScore - 1] ?? 10
      } else if (strengthScore >= 30) {
        // For STR 30+, every +10 doubles the heavy load from STR 20
        const base = 400 // STR 20 heavy load
        const extra = strengthScore - 20
        const factor = Math.floor(extra / 10)
        heavy = base * Math.pow(2, factor)
        // For scores between multiples of 10, scale proportionally
        const remainder = extra % 10
        if (remainder > 0) {
          // Use next doubling as upper bound
          const nextHeavy = base * Math.pow(2, factor + 1)
          heavy = Math.floor(heavy + (nextHeavy - heavy) * (remainder / 10))
        }
      }
      const medium = Math.floor((2 * heavy) / 3)
      const light = Math.floor(heavy / 3)
      const lift = heavy * 2
      const drag = heavy * 5
      const cap = data.character.movement.capacity
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
    }
  }
  // ...existing code...

  // Combat update logic: propagate recalculated strength modifier to melee attacks and weapons
  if (data.character?.combat?.attack && abilities.strength) {
    // Always recalculate strength modifier from score
    let strengthMod: number | undefined
    if (Array.isArray(abilities.strength)) {
      const score = abilities.strength[0]
      if (typeof score === 'number') {
        strengthMod = Math.floor((score - 10) / 2)
      }
    }
    if (typeof strengthMod === 'number') {
      // Update generic melee attack
      const melee = data.character.combat.attack.melee
      if (melee && melee._ && Array.isArray(melee._) && melee._.length >= 2) {
        const [currentValue, modifiers] = melee._ as [
          number,
          Record<string, number>,
        ]
        if (modifiers && typeof modifiers === 'object') {
          if (modifiers.str !== strengthMod) {
            modifiers.str = strengthMod
            hasChanges = true
          }
          // Recalculate melee attack value
          let newValue = 0
          for (const value of Object.values(modifiers)) {
            newValue += typeof value === 'number' ? value : 0
          }
          if (currentValue !== newValue) {
            melee._[0] = newValue
            hasChanges = true
          }
        }
      }
      // Update named melee weapons
      for (const [weaponName, weaponArr] of Object.entries(melee)) {
        if (weaponName === '_') continue
        if (Array.isArray(weaponArr) && weaponArr.length >= 5) {
          // weaponArr[4] is usually the str modifier object
          const strObj = weaponArr[4]
          if (strObj && typeof strObj === 'object' && 'str' in strObj) {
            if (strObj.str !== strengthMod) {
              strObj.str = strengthMod
              hasChanges = true
            }
          }
          // Propagate generic melee bonus to weaponArr[3]._
          if (
            melee._ &&
            Array.isArray(melee._) &&
            typeof melee._[0] === 'number'
          ) {
            if (weaponArr[3] && typeof weaponArr[3] === 'object') {
              if (weaponArr[3]._ !== melee._[0]) {
                weaponArr[3]._ = melee._[0]
                hasChanges = true
              }
            }
          }
          // Sum all numeric values in weaponArr[3] for total attack bonus
          let atkBonus = 0
          if (weaponArr[3] && typeof weaponArr[3] === 'object') {
            for (const value of Object.values(weaponArr[3])) {
              atkBonus += typeof value === 'number' ? value : 0
            }
          }
          if (typeof weaponArr[0] === 'number' && weaponArr[0] !== atkBonus) {
            weaponArr[0] = atkBonus
            hasChanges = true
          }
          // Update weapon damage string (e.g., '1d8+2 slashing')
          if (typeof weaponArr[1] === 'string') {
            weaponArr[1] = weaponArr[1].replace(
              /1d8\+[0-9]+/,
              `1d8+${strengthMod}`,
            )
            hasChanges = true
          }
        }
      }

      // Update grapple
      const grappleArr = data.character.combat.attack.grapple
      if (Array.isArray(grappleArr) && grappleArr.length >= 2) {
        const [currentValue, modifiers] = grappleArr as [
          number,
          Record<string, number>,
        ]
        if (modifiers && typeof modifiers === 'object') {
          if (modifiers.str !== strengthMod) {
            modifiers.str = strengthMod
            hasChanges = true
          }
          // Recalculate grapple value
          let newValue = 0
          for (const value of Object.values(modifiers)) {
            newValue += typeof value === 'number' ? value : 0
          }
          if (currentValue !== newValue) {
            grappleArr[0] = newValue
            hasChanges = true
          }
        }
      }
    }
  }
  // ...existing code...

  // Skill update logic: propagate strength modifier to strength-based skills
  if (data.character?.skills && abilities.strength) {
    // Always recalculate strength modifier from score
    let strengthMod: number | undefined
    if (Array.isArray(abilities.strength)) {
      const score = abilities.strength[0]
      if (typeof score === 'number') {
        strengthMod = Math.floor((score - 10) / 2)
      }
    }
    // List of strength-based skills in D&D 3.5e
    const strengthSkills = ['climb', 'jump', 'swim']
    if (typeof strengthMod === 'number') {
      for (const [skillName, skillArr] of Object.entries(
        data.character.skills,
      )) {
        if (Array.isArray(skillArr) && skillArr.length >= 2) {
          const [currentValue, modifiers] = skillArr as [
            number,
            Record<string, number>,
          ]
          if (
            modifiers &&
            typeof modifiers === 'object' &&
            (strengthSkills.includes(skillName) || 'str' in modifiers)
          ) {
            // Always set str modifier for strength-based skills
            if (modifiers.str !== strengthMod) {
              modifiers.str = strengthMod
              hasChanges = true
            }
            // Recalculate skill value
            let newValue = 0
            for (const value of Object.values(modifiers)) {
              newValue += typeof value === 'number' ? value : 0
            }
            if (currentValue !== newValue) {
              skillArr[0] = newValue
              hasChanges = true
            }
          }
        }
      }
    }
  }
  // ...existing code...

  // Ability score calculation logic (focus on strength)
  if (data.character?.abilities) {
    for (const [abilityName, abilityArr] of Object.entries(
      data.character.abilities,
    )) {
      if (Array.isArray(abilityArr)) {
        // If calculation details are present, use them
        if (abilityArr.length >= 3) {
          const [currentScore, modifierData, calculationDetails] =
            abilityArr as [
              number,
              Record<string, number>,
              Record<string, number>,
            ]
          if (
            calculationDetails &&
            typeof calculationDetails === 'object' &&
            typeof calculationDetails.base === 'number'
          ) {
            let totalScore = calculationDetails.base
            for (const [key, value] of Object.entries(calculationDetails)) {
              if (key !== 'base' && typeof value === 'number') {
                totalScore += value
              }
            }
            const modifier = Math.floor((totalScore - 10) / 2)
            let needsUpdate = false
            if (currentScore !== totalScore) {
              abilityArr[0] = totalScore
              needsUpdate = true
            }
            if (typeof modifierData === 'object' && modifierData !== null) {
              const firstKey = Object.keys(modifierData)[0]
              if (firstKey && modifierData[firstKey] !== modifier) {
                abilityArr[1] = { [firstKey]: modifier }
                needsUpdate = true
              }
            }
            if (needsUpdate) {
              hasChanges = true
            }
          }
        } else if (abilityArr.length === 2) {
          // If only [score, {mod}] is present, recalculate modifier from score
          const [score, modifierData] = abilityArr as [
            number,
            Record<string, number>,
          ]
          if (
            typeof score === 'number' &&
            typeof modifierData === 'object' &&
            modifierData !== null
          ) {
            const modifier = Math.floor((score - 10) / 2)
            const firstKey = Object.keys(modifierData)[0]
            if (firstKey && modifierData[firstKey] !== modifier) {
              abilityArr[1] = { [firstKey]: modifier }
              hasChanges = true
            }
          }
        }
      }
    }
  }

  // If changes were made, reformat and return
  if (hasChanges) {
    const doc = new Document(data)
    // Recursively set flow style only for schema-defined paths
    setSelectiveFlowStyle(doc.contents)

    // Convert to string with no line length restriction and no flow collection padding
    let result = doc.toString({
      lineWidth: 0,
      flowCollectionPadding: false,
      directives: true,
    })

    // Strip curly braces from single-key maps in flow-style arrays
    // e.g. [14, {str: 2}] => [14, str: 2], but leave multi-key maps untouched
    result = result.replace(/\{\s*([a-zA-Z0-9_-]+):\s*([^},]+)\s*\}/g, '$1: $2')

    return result
  }
  return yamlContent
}

// Export all functions
export * from './types'
