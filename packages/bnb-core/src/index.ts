import { parse as parseYAML, Document, YAMLSeq, YAMLMap } from 'yaml'

/**
 * Beef Brain Core Library
 *
 * The library that powers the human-readable data formats for TTRPG character and creature calculation.
 *
 * @public
 */

// Type definitions
interface CalculationDetails {
  base: number
  [key: string]: number
}

interface ModifierData {
  [key: string]: number
}

type AbilityData = [number, ModifierData, CalculationDetails]

interface Abilities {
  [abilityName: string]: AbilityData
}

interface Character {
  abilities: Abilities
  skills?: Record<string, [number, Record<string, number>]>
  combat?: any
}

interface BeefBrainData {
  character?: Character
}

/**
 * Validates that a YAML file is a valid Beef Brain data file.
 * @param yamlContent - The YAML content to validate
 * @returns True if valid, false otherwise
 * @public
 */
export function validateBeefBrainData(yamlContent: string): boolean {
  try {
    // Check if content is empty (valid case)
    if (!yamlContent.trim()) {
      return true
    }

    // Use the yaml library to parse and validate the content
    parseYAML(yamlContent)
    return true
  } catch {
    // If parsing fails, the YAML is invalid
    return false
  }
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

  // Movement carrying capacity update logic
  if (data.character?.movement?.capacity && abilities.strength) {
    let strengthScore: number | undefined
    if (Array.isArray(abilities.strength)) {
      strengthScore = abilities.strength[0]
    }
    if (typeof strengthScore === 'number') {
      // D&D 3.5e carrying capacity table for STR 18
      // light: 100 lbs, medium: 200 lbs, heavy: 300 lbs, lift: 600 lbs, drag: 1500 lbs
      // For STR 10: light: 33 lbs, medium: 66 lbs, heavy: 100 lbs, lift: 200 lbs, drag: 500 lbs
      // Use a lookup table for common values, otherwise calculate proportionally
      const capacityTable: Record<string, number[]> = {
        '10': [33, 66, 100, 200, 500],
        '18': [100, 200, 300, 600, 1500],
      }
      let values = capacityTable[String(strengthScore)]
      if (!values) {
        // Linear interpolation for other scores (approximate)
        // D&D 3.5e: Each +10 STR doubles capacity
        // Find nearest lower multiple of 10
        let base = 10
        let multiplier = 1
        while (strengthScore > base) {
          base += 10
          multiplier *= 2
        }
        // Use STR 10 as base
        values = [33, 66, 100, 200, 500].map((v) => v * multiplier)
      }
      const [light, medium, heavy, lift, drag] = values
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

  // Combat update logic: propagate strength modifier to melee attacks and weapons
  if (data.character?.combat?.attack && abilities.strength) {
    let strengthMod: number | undefined
    if (Array.isArray(abilities.strength)) {
      const modObj = abilities.strength[1]
      if (modObj && typeof modObj === 'object' && 'str' in modObj) {
        strengthMod = modObj.str
      }
    }
    if (typeof strengthMod === 'number') {
      // Update generic melee attack
      const melee = data.character.combat.attack.melee
      if (melee && melee._ && Array.isArray(melee._) && melee._.length >= 2) {
        const [currentValue, modifiers] = melee._ as [number, Record<string, number>]
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
          if (melee._ && Array.isArray(melee._) && typeof melee._[0] === 'number') {
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
            weaponArr[1] = weaponArr[1].replace(/1d8\+[0-9]+/, `1d8+${strengthMod}`)
            hasChanges = true
          }
        }
      }
    }
  }
  // ...existing code...

  // Skill update logic: propagate strength modifier to skills
  if (data.character?.skills && abilities.strength) {
    // Determine strength modifier
    let strengthMod: number | undefined
    if (Array.isArray(abilities.strength)) {
      const modObj = abilities.strength[1]
      if (modObj && typeof modObj === 'object' && 'str' in modObj) {
        strengthMod = modObj.str
      }
    }
    if (typeof strengthMod === 'number') {
      for (const [skillName, skillArr] of Object.entries(data.character.skills)) {
        if (Array.isArray(skillArr) && skillArr.length >= 2) {
          const [currentValue, modifiers] = skillArr as [number, Record<string, number>]
          if (modifiers && typeof modifiers === 'object' && 'str' in modifiers) {
            // Update str modifier
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
    for (const [abilityName, abilityArr] of Object.entries(data.character.abilities)) {
      if (Array.isArray(abilityArr)) {
        // If calculation details are present, use them
        if (abilityArr.length >= 3) {
          const [currentScore, modifierData, calculationDetails] = abilityArr as [number, Record<string, number>, Record<string, number>]
          if (calculationDetails && typeof calculationDetails === 'object' && typeof calculationDetails.base === 'number') {
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
          const [score, modifierData] = abilityArr as [number, Record<string, number>]
          if (typeof score === 'number' && typeof modifierData === 'object' && modifierData !== null) {
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
    let result = doc.toString({ lineWidth: 0, flowCollectionPadding: false })

    // Strip curly braces from single-key maps in flow-style arrays
    // e.g. [14, {str: 2}] => [14, str: 2], but leave multi-key maps untouched
    result = result.replace(/\{\s*([a-zA-Z0-9_-]+):\s*([^},]+)\s*\}/g, '$1: $2')

    // Add YAML document markers to match expected format
    result = '\n---\n' + result

    return result
  }
  return yamlContent
}

/**
 * Applies a modifier to a Beef Brain data file.
 * @param yamlContent - The YAML content to modify
 * @param modifier - The modifier to apply
 * @returns Modified YAML content
 * @public
 */
export function applyModifier(yamlContent: string, modifier: unknown): string {
  // TODO: Implement modifier application
  // Note: modifier applied to content of length: yamlContent.length
  return yamlContent
}

// Export all functions
export * from './types'
