import { validateBeefBrainData } from './validateBeefBrainData'
import { updateCalculatedFields } from './updateCalculatedFields'
import { EffectTargetError } from './propagateEffects'

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
export { EffectTargetError }
export {
  editItemFromLines,
  itemEditLines,
  joinItem,
  splitItem,
  summarizeItemEffects,
} from './itemTuple'
export type { ItemEffect, ItemParts } from './itemTuple'
export {
  NON_STACKING_BONUS_TYPES,
  bonusType,
  sumStacked,
} from './bonusStacking'
export {
  bonusSpellSlots,
  getSpellSaveDc,
  getSpellcastingIssues,
  matchesSpellDcCondition,
  parseCastingProfile,
  SpellcastingDataError,
} from './spellcasting'
export type {
  AppliedSpellDcModifier,
  CastingAbility,
  CastingProfile,
  SpellDcCondition,
  SpellDcModifier,
  SpellMetadata,
  SpellSaveDcResult,
  SpellcastingIssue,
  SpellcastingIssueCode,
  SpellcastingMode,
  SpellcastingTradition,
} from './spellcasting'
export {
  formatSkillPointMismatch,
  getSkillPointMismatch,
  type SkillPointMismatch,
} from './skillPoints'
export { addExpectedFields } from './addExpectedFields'
export { DND35_CORE_SKILLS, type CoreSkill } from './dnd35Skills'
