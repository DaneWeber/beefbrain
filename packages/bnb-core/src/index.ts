import { validateBeefBrainData } from './validateBeefBrainData'
import { updateCalculatedFields } from './updateCalculatedFields'

/**
 * Beef Brain Core Library
 *
 * The library that powers the human-readable data formats for TTRPG character and creature calculation.
 *
 * @public
 */

// Type definitions

export type YAMLdoc = `---\n${string}`

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

export type BeefBrainData = {
  character?: Character
}

export { validateBeefBrainData }
export { updateCalculatedFields }

// Export all functions
export * from './types'
