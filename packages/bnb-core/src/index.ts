import { validateBeefBrainData } from './validateBeefBrainData'
import { updateCalculatedFields } from './updateCalculatedFields'

/**
 * Beef Brain Core Library
 *
 * The library that powers the human-readable data formats for TTRPG character and creature calculation.
 *
 * @public
 */

// Re-export all type definitions from types.ts
export type {
  YAMLdoc,
  CalculationDetails,
  ModifierData,
  AbilityData,
  Abilities,
  Character,
  BeefBrainData,
  BeefBrainModifier,
} from './types'

export { validateBeefBrainData }
export { updateCalculatedFields }
export { dataToCompactYAML } from './dataToCompactYAML'
