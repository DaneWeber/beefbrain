import { parse as parseYAML } from 'yaml'
import { dataToCompactYAML } from './dataToCompactYAML'
import {
  ACP_FIELD,
  DND35_CORE_SKILLS,
  getAcpTotal,
  moveLegacyAcp,
  setSkillsField,
  skillAcp,
  type AbilityAbbr,
  type CoreSkill,
} from './dnd35Skills'

const ABILITY_NAMES: Record<AbilityAbbr, string> = {
  str: 'strength',
  dex: 'dexterity',
  con: 'constitution',
  int: 'intelligence',
  wis: 'wisdom',
  cha: 'charisma',
}

// Shorthand prefixes already used in character files for a skill family,
// e.g. know-arcana for Knowledge (arcana).
const SKILL_ALIASES: Record<string, string[]> = {
  knowledge: ['know'],
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * A skill counts as present if it is listed directly or as a specialization,
 * e.g. craft-traps, knowledge-nature or know-planes.
 */
function hasSkill(skillNames: string[], name: string): boolean {
  const prefixes = [name, ...(SKILL_ALIASES[name] ?? [])]
  return skillNames.some((key) =>
    prefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}-`)),
  )
}

/** Only D&D 3.5 characters use [score, {abbr: mod}] ability entries. */
function isDnd35Abilities(abilities: Record<string, unknown>): boolean {
  return Object.values(ABILITY_NAMES).some((name) =>
    Array.isArray(abilities[name]),
  )
}

function getAbilityMod(
  abilities: Record<string, unknown>,
  abbr: AbilityAbbr,
): number {
  const entry = abilities[ABILITY_NAMES[abbr]]
  if (!Array.isArray(entry)) return 0
  const mods = entry[1]
  if (isRecord(mods) && typeof mods[abbr] === 'number') return mods[abbr]
  if (typeof entry[0] === 'number') return Math.floor((entry[0] - 10) / 2)
  return 0
}

function buildSkillEntry(
  skill: CoreSkill,
  abilities: Record<string, unknown>,
  acpTotal: number,
): [number, Record<string, number>] {
  const components: Record<string, number> = {}
  if (skill.ability) {
    components[skill.ability] = getAbilityMod(abilities, skill.ability)
  }
  if (skill.armorPenalty) {
    components.acp = skillAcp(skill.name, acpTotal)
  }
  if (skill.trainedOnly) {
    components['not-trained'] = NaN
    return [NaN, components]
  }
  const total = Object.values(components).reduce((sum, v) => sum + v, 0)
  return [total, components]
}

/**
 * Inserts each missing skill ahead of the first existing skill that sorts
 * after it, so alphabetized lists stay alphabetized and any custom order the
 * existing skills are in is kept.
 */
function mergeSkills(
  existing: Record<string, unknown>,
  missing: Array<[string, unknown]>,
): Record<string, unknown> {
  const merged: Record<string, unknown> = {}
  const pending = [...missing]
  for (const [key, value] of Object.entries(existing)) {
    if (!key.startsWith('_')) {
      while (pending.length > 0 && pending[0]![0] < key) {
        const [name, entry] = pending.shift()!
        merged[name] = entry
      }
    }
    merged[key] = value
  }
  for (const [name, entry] of pending) merged[name] = entry
  return merged
}

/**
 * Adds expected fields that are missing from a Beef Brain data file, without
 * changing any that are already there. Currently this adds, for D&D 3.5:
 * - `skills._acp`, the armor check penalty total (moved from the legacy
 *   `combat.defense.acp` if present, otherwise `[0]` for the calculation to
 *   fill in)
 * - every core skill that is not already listed, populated with its key
 *   ability modifier, plus `acp` for skills armor check penalty applies to.
 *   Trained-only skills are added as `[.nan, {<ability>: N, not-trained: .nan}]`
 *   since a character without ranks cannot attempt them.
 * @param yamlContent - The YAML content to fill in
 * @returns YAML content with missing fields added
 * @public
 */
export function addExpectedFields(yamlContent: string): string {
  const data = parseYAML(yamlContent)
  if (!isRecord(data) || !isRecord(data.character)) return yamlContent

  const character = data.character
  const abilities = character.abilities
  if (!isRecord(abilities) || !isDnd35Abilities(abilities)) return yamlContent

  let changed = moveLegacyAcp(character)
  let skills = isRecord(character.skills) ? character.skills : {}
  if (!(ACP_FIELD in skills)) {
    skills = setSkillsField(skills, ACP_FIELD, [0])
    changed = true
  }
  const acpTotal = getAcpTotal(skills) ?? 0

  const skillNames = Object.keys(skills)
  const missing = DND35_CORE_SKILLS.filter(
    (skill) => !hasSkill(skillNames, skill.name),
  ).map((skill): [string, unknown] => [
    skill.name,
    buildSkillEntry(skill, abilities, acpTotal),
  ])
  if (!changed && missing.length === 0) return yamlContent

  character.skills = mergeSkills(skills, missing)
  return dataToCompactYAML(data)
}
