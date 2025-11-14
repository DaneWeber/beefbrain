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

/**
 * Updates the calculated fields in a Beef Brain data file.
 * @param yamlContent - The YAML content to update
 * @returns Updated YAML content with calculated fields
 * @public
 */
export function updateCalculatedFields(yamlContent: string): string {
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
  let hasChanges = false

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

    // Set ability arrays to flow style to maintain compact formatting
    for (const abilityName of Object.keys(abilities)) {
      const abilityArrayNode = doc.getIn(
        ['character', 'abilities', abilityName],
        true,
      )
      if (abilityArrayNode instanceof YAMLSeq) {
        abilityArrayNode.flow = true

        // Set the calculation details object (third element) to flow style
        const calculationNode = abilityArrayNode.get(2, true)
        if (calculationNode instanceof YAMLMap) {
          calculationNode.flow = true
        }
      }
    }

    // Convert to string and then fix the modifier formatting
    let result = String(doc)

    // Fix the modifier formatting from { key: value } to key: value
    // This regex finds patterns like "[ number, { key: value }, { ... } ]"
    // and converts them to "[ number, key: value, { ... } ]"
    result = result.replace(
      /(\[)\s*(\d+),\s*\{\s*([^:]+):\s*([^}]+)\s*\},\s*(\{[^}]*\})\s*(\])/g,
      '$1$2, $3: $4, $5$6',
    )

    // Fix any extra spaces around the modifier
    result = result.replace(/(\w+):\s*(-?\d+)\s*,/g, '$1: $2,')

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
