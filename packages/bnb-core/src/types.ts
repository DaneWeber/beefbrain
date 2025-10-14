/**
 * Core types for Beef Brain data structures
 */

/**
 * Represents a modifier that can be applied to character or creature data
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

/**
 * Base structure for Beef Brain data files
 * @public
 */
export interface BeefBrainData {
  /** Version of the data format */
  version: string
  /** Type of data (character, creature, etc.) */
  type: 'character' | 'creature' | 'item' | 'spell'
  /** The main data content */
  data: Record<string, unknown>
  /** Calculated fields that are derived from the main data */
  calculated?: Record<string, unknown>
  /** Metadata about the data file */
  metadata?: {
    created?: string
    modified?: string
    author?: string
    description?: string
  }
}