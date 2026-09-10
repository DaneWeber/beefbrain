export interface SkillPointMismatch {
  fieldName: '_points'
  available: number
  distributed: number
}

function getRanks(skill: unknown): number | undefined {
  if (!Array.isArray(skill) || skill.length < 2) return undefined

  const components = skill[1]
  if (!components || typeof components !== 'object' || Array.isArray(components))
    return undefined

  const ranks = (components as Record<string, unknown>).ranks
  if (typeof ranks === 'number') return ranks
  if (Array.isArray(ranks) && typeof ranks[0] === 'number') return ranks[0]
  return undefined
}

/**
 * Compares the available skill-point total with the ranks distributed among
 * individual skills. This reports a mismatch without changing either value.
 */
export function getSkillPointMismatch(
  data: unknown,
): SkillPointMismatch | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined

  const character = (data as Record<string, unknown>).character
  if (!character || typeof character !== 'object' || Array.isArray(character))
    return undefined

  const skills = (character as Record<string, unknown>).skills
  if (!skills || typeof skills !== 'object' || Array.isArray(skills))
    return undefined

  const skillRecord = skills as Record<string, unknown>
  const fieldName = '_points'
  const pointEntry = skillRecord[fieldName]
  if (!Array.isArray(pointEntry) || typeof pointEntry[0] !== 'number')
    return undefined

  let distributed = 0
  for (const [skillName, skill] of Object.entries(skillRecord)) {
    if (skillName.startsWith('_')) continue
    distributed += getRanks(skill) ?? 0
  }

  const available = pointEntry[0]
  if (available === distributed) return undefined

  return { fieldName, available, distributed }
}
