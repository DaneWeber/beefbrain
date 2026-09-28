export type AbilityAbbr = 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha'

export interface CoreSkill {
  name: string
  ability?: AbilityAbbr
  trainedOnly?: boolean
  /** Whether armor check penalty applies, and 'double' for swim. */
  armorPenalty?: true | 'double'
}

/**
 * D&D 3.5e core skills. Mirrors catalogs/dnd35/skills.yaml (a test keeps the
 * two in sync).
 */
export const DND35_CORE_SKILLS: readonly CoreSkill[] = [
  { name: 'appraise', ability: 'int' },
  { name: 'balance', ability: 'dex', armorPenalty: true },
  { name: 'bluff', ability: 'cha' },
  { name: 'climb', ability: 'str', armorPenalty: true },
  { name: 'concentration', ability: 'con' },
  { name: 'craft', ability: 'int' },
  { name: 'decipher-script', ability: 'int', trainedOnly: true },
  { name: 'diplomacy', ability: 'cha' },
  { name: 'disable-device', ability: 'int', trainedOnly: true },
  { name: 'disguise', ability: 'cha' },
  { name: 'escape-artist', ability: 'dex', armorPenalty: true },
  { name: 'forgery', ability: 'int' },
  { name: 'gather-information', ability: 'cha' },
  { name: 'handle-animal', ability: 'cha', trainedOnly: true },
  { name: 'heal', ability: 'wis' },
  { name: 'hide', ability: 'dex', armorPenalty: true },
  { name: 'intimidate', ability: 'cha' },
  { name: 'jump', ability: 'str', armorPenalty: true },
  { name: 'knowledge', ability: 'int', trainedOnly: true },
  { name: 'listen', ability: 'wis' },
  { name: 'move-silently', ability: 'dex', armorPenalty: true },
  { name: 'open-lock', ability: 'dex', trainedOnly: true },
  { name: 'perform', ability: 'cha' },
  { name: 'profession', ability: 'wis', trainedOnly: true },
  { name: 'ride', ability: 'dex' },
  { name: 'search', ability: 'int' },
  { name: 'sense-motive', ability: 'wis' },
  {
    name: 'sleight-of-hand',
    ability: 'dex',
    trainedOnly: true,
    armorPenalty: true,
  },
  { name: 'speak-language', trainedOnly: true },
  { name: 'spellcraft', ability: 'int', trainedOnly: true },
  { name: 'spot', ability: 'wis' },
  { name: 'survival', ability: 'wis' },
  { name: 'swim', ability: 'str', armorPenalty: 'double' },
  { name: 'tumble', ability: 'dex', trainedOnly: true, armorPenalty: true },
  { name: 'use-magic-device', ability: 'cha', trainedOnly: true },
  { name: 'use-rope', ability: 'dex' },
]

const DOUBLE_ACP_SKILLS = new Set(
  DND35_CORE_SKILLS.filter((skill) => skill.armorPenalty === 'double').map(
    (skill) => skill.name,
  ),
)

/** The armor check penalty a skill takes, given the character's total ACP. */
export function skillAcp(skillName: string, acpTotal: number): number {
  return DOUBLE_ACP_SKILLS.has(skillName) ? acpTotal * 2 : acpTotal
}

/** Where the character's total armor check penalty lives. */
export const ACP_FIELD = '_acp'

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Sets a `_`-prefixed field on the skills block, keeping those fields ahead of
 * the individual skills. Returns the (possibly new) skills object.
 */
export function setSkillsField(
  skills: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  if (key in skills) {
    skills[key] = value
    return skills
  }
  const entries = Object.entries(skills)
  const insertAt = entries.findIndex(([name]) => !name.startsWith('_'))
  entries.splice(insertAt === -1 ? entries.length : insertAt, 0, [key, value])
  return Object.fromEntries(entries)
}

/** Reads the total from `skills._acp`, if the character has one. */
export function getAcpTotal(skills: unknown): number | undefined {
  if (!isRecord(skills)) return undefined
  const acp = skills[ACP_FIELD]
  return Array.isArray(acp) && typeof acp[0] === 'number' ? acp[0] : undefined
}

/**
 * Normalizes a legacy ACP entry like `[-4, {armor: -2}, {shield: -2}]` or
 * `[0, none: 0]` to `[total, {sources}]`, dropping zero-valued sources.
 */
function normalizeAcp(value: unknown): unknown[] {
  if (!Array.isArray(value)) return [typeof value === 'number' ? value : 0]
  const sources: Record<string, unknown> = {}
  for (const element of value.slice(1)) {
    if (!isRecord(element)) continue
    for (const [key, amount] of Object.entries(element)) {
      if (amount !== 0) sources[key] = amount
    }
  }
  const total = typeof value[0] === 'number' ? value[0] : 0
  return Object.keys(sources).length > 0 ? [total, sources] : [total]
}

/**
 * ACP used to live at `combat.defense.acp`. It only affects skills, so it now
 * lives at `skills._acp`. Moves a legacy entry over (unless `_acp` is already
 * there) and removes it from defense. Returns true if anything changed.
 */
export function moveLegacyAcp(character: Record<string, unknown>): boolean {
  const combat = character.combat
  const defense = isRecord(combat) ? combat.defense : undefined
  if (!isRecord(defense) || !('acp' in defense)) return false

  const skills = isRecord(character.skills) ? character.skills : {}
  if (!(ACP_FIELD in skills)) {
    character.skills = setSkillsField(
      skills,
      ACP_FIELD,
      normalizeAcp(defense.acp),
    )
  }
  delete defense.acp
  return true
}
