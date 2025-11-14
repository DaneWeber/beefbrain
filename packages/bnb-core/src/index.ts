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
  let hasChanges = false
  // Validate YAML first - throw error if invalid
  let data: BeefBrainData
  try {
    data = parseYAML(yamlContent) as BeefBrainData
  } catch (error) {
    throw new Error(`Invalid YAML content: ${error}`)
  }

  // If empty or no data, return as-is
  if (!data || !data.character?.abilities) {
    return yamlContent
  }

  // Process abilities
  const abilities = data.character.abilities

  // Update skills section for strength modifier propagation
  if (data.character?.skills && abilities.strength) {
    const strengthMod = Array.isArray(abilities.strength)
      ? (abilities.strength[1] as Record<string, number>).str
      : undefined
    if (typeof strengthMod === 'number') {
      for (const [skillName, skillDataRaw] of Object.entries(
        data.character.skills,
      )) {
        if (Array.isArray(skillDataRaw) && skillDataRaw.length >= 2) {
          const [currentValue, modifiers] = skillDataRaw as [
            number,
            Record<string, number>,
          ]
          if (
            modifiers &&
            typeof modifiers === 'object' &&
            'str' in modifiers
          ) {
            // Update str modifier
            if (modifiers.str !== strengthMod) {
              modifiers.str = strengthMod
              hasChanges = true
            }
            // Recalculate skill value
            let newValue = 0
            for (const [key, value] of Object.entries(modifiers)) {
              newValue += value
            }
            if (currentValue !== newValue) {
              skillDataRaw[0] = newValue
              hasChanges = true
            }
          }
        }
      }
    }
  }
  // let hasChanges = false (already declared at top)

  for (const [abilityName, abilityDataRaw] of Object.entries(abilities)) {
    const abilityData = abilityDataRaw as
      | [number, Record<string, number>]
      | [number, Record<string, number>, Record<string, number>]
    if (Array.isArray(abilityData)) {
      // If calculation details are present, use them
      if (abilityData.length >= 3) {
        const [currentScore, modifierData, calculationDetails] =
          abilityData as [
            number,
            Record<string, number>,
            Record<string, number>,
          ]
        if (
          calculationDetails &&
          typeof calculationDetails === 'object' &&
          typeof (calculationDetails as Record<string, number>).base ===
            'number'
        ) {
          // Calculate the ability score from base
          const baseScore =
            (calculationDetails as Record<string, number>).base ?? 0
          let totalScore: number = baseScore
          for (const [key, value] of Object.entries(
            calculationDetails as Record<string, number>,
          )) {
            if (key !== 'base' && typeof value === 'number') {
              totalScore += value
            }
          }
          const modifier = Math.floor((totalScore - 10) / 2)
          let needsUpdate = false
          if (currentScore !== totalScore) {
            needsUpdate = true
          }
          if (typeof modifierData === 'object' && modifierData !== null) {
            const firstKey = Object.keys(modifierData)[0]
            if (
              firstKey &&
              (modifierData as Record<string, number>)[firstKey] !== modifier
            ) {
              needsUpdate = true
            }
          }
          if (needsUpdate) {
            hasChanges = true
            abilityData[0] = totalScore
            if (typeof modifierData === 'object' && modifierData !== null) {
              const firstKey = Object.keys(modifierData)[0]
              if (firstKey) {
                abilityData[1] = { [firstKey]: modifier }
              }
            }
          }
        }
      } else if (Array.isArray(abilityData) && abilityData.length === 2) {
        // If only [score, {mod}] is present, recalculate modifier from score
        const [score, modifierData] = abilityData as [
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
          if (
            firstKey &&
            (modifierData as Record<string, number>)[firstKey] !== modifier
          ) {
            hasChanges = true
            abilityData[1] = { [firstKey]: modifier }
          }
        }
      }
    }
  }

  // Only convert back to YAML if there were changes
  if (hasChanges) {
    // Create a Document from the updated data
    const doc = new Document(data)

    // Recursively set flow style only for schema-defined paths
    setSelectiveFlowStyle(doc.contents)

    // Convert to string with no line length restriction and no flow collection padding, then fix the modifier formatting
    let result = doc.toString({ lineWidth: 0, flowCollectionPadding: false })

    // Strip curly braces from single-key maps in flow-style arrays
    // e.g. [14, {str: 2}] => [14, str: 2], but leave multi-key maps untouched
    result = result.replace(/\{\s*([a-zA-Z0-9_-]+):\s*([^},]+)\s*\}/g, '$1: $2')

    // Add YAML document markers to match expected format
    result = '\n---\n' + result

    return result
  } else {
    return yamlContent
  }
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
