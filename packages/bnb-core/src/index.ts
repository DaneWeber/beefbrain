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
  // Parse YAML content
  const data = parseYAML(yamlContent)
  let hasChanges = false
  const abilities = data.character?.abilities || {}

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
    // ...formatting logic...
    return String(doc)
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
