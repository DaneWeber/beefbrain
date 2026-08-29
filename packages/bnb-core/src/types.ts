/**
 * Core types for Beef Brain data structures
 * @public
 */

/**
 * The marker type for YAML document strings (must start with ---)
 * @public
 */
export type YAMLdoc = `---\n${string}`

/**
 * Details about how an ability score is calculated (base + modifiers)
 * @public
 */
export type CalculationDetails = {
  base: number
  [key: string]: number
}

/**
 * A modifier value that can be applied to an ability or attribute
 * @public
 */
export type ModifierData = {
  [key: string]: number
}

/**
 * An ability score entry: [score, modifiers, calculation_details]
 * @public
 */
export type AbilityData = [number, ModifierData, CalculationDetails?]

/**
 * Character abilities (e.g., strength, dexterity, wisdom)
 * @public
 */
export type Abilities = {
  [abilityName: string]: AbilityData
}

/**
 * Character data including abilities, skills, and combat stats
 * @public
 */
export type Character = {
  abilities: Abilities
  skills?: Record<string, [number, Record<string, number>]>
  combat?: Record<string, unknown>
}

/**
 * Root Beef Brain data structure for character or creature files
 * @public
 */
export type BeefBrainData = {
  character?: Character
}

/**
 * Represents a modifier or effect that can be applied to character or creature data
 * @public
 */
export interface BeefBrainModifier {
  /** The type of modifier (e.g., 'ability', 'skill', 'combat') */
  type: string
  /** The target field or property to modify */
  target: string
  /** The value to apply (could be numeric, string, or complex object) */
  value: unknown
  /** Optional description of what this modifier does */
  description?: string
}
