import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { getSkillIcon, SKILL_ICONS } from './skillIcons'
import { DND35_DETAILED_TEMPLATE } from './templates/dnd35/detailed'

const CATALOG = yaml.load(
  readFileSync(
    resolve(__dirname, '../../bnb-core/catalogs/dnd35/skills.yaml'),
    'utf-8',
  ),
) as { skills: Record<string, unknown> }

// The emoji package's own name table. An unknown name is only a warning in
// LaTeX and renders nothing, so check the names here instead.
const EMOJI_TABLE_PATH =
  '/usr/share/texlive/texmf-dist/tex/latex/emoji/emoji-table.def'
const emojiTable = (() => {
  try {
    return readFileSync(EMOJI_TABLE_PATH, 'utf-8')
  } catch {
    return undefined
  }
})()

describe('SKILL_ICONS', () => {
  it('has an icon for every skill in the dnd35 catalog', () => {
    const missing = Object.keys(CATALOG.skills).filter(
      (skill) => !SKILL_ICONS[skill],
    )
    expect(missing).toEqual([])
  })

  it.skipIf(!emojiTable)('uses only names the emoji package knows', () => {
    const unknown = [...new Set(Object.values(SKILL_ICONS))].filter(
      (name) => !emojiTable?.includes(`{${name}}`),
    )
    expect(unknown).toEqual([])
  })
})

describe('DND35_DETAILED_TEMPLATE icons', () => {
  // Every emoji name the template writes directly: inline \emoji{...}, and
  // the first (icon) argument of the page 1 row macros.
  const templateIcons = [
    ...DND35_DETAILED_TEMPLATE.matchAll(
      /\\(?:emoji|rowicon|inlineicon|statrow|abilityrow)\{([a-z-]+)\}/g,
    ),
    ...DND35_DETAILED_TEMPLATE.matchAll(
      // A \descrow's second icon follows the first value, `{ {{token}} }`.
      /\\descrow\{([a-z-]+)\}.*? \}\{([a-z-]+)\}/g,
    ),
  ].flatMap((match) => match.slice(1))

  it('finds the page 1 icons', () => {
    expect(templateIcons).toContain('shield')
    expect(templateIcons).toContain('game-die')
  })

  it.skipIf(!emojiTable)('uses only names the emoji package knows', () => {
    const unknown = [...new Set(templateIcons)].filter(
      (name) => !emojiTable?.includes(`{${name}}`),
    )
    expect(unknown).toEqual([])
  })
})

describe('getSkillIcon', () => {
  it('finds a skill by its exact key', () => {
    expect(getSkillIcon('use-rope')).toBe('knot')
    expect(getSkillIcon('open-lock')).toBe('locked')
  })

  it('prefers a subtype icon over the base skill', () => {
    expect(getSkillIcon('knowledge-arcana')).toBe('crystal-ball')
    expect(getSkillIcon('craft-traps')).toBe('mouse-trap')
  })

  it('falls back to the nearest listed prefix', () => {
    expect(getSkillIcon('knowledge-religion-pelor')).toBe('folded-hands')
    expect(getSkillIcon('perform-reed-flute')).toBe('performing-arts')
    expect(getSkillIcon('profession-sailor')).toBe('coin')
  })

  it('reads a know- abbreviation as knowledge-', () => {
    expect(getSkillIcon('know-planes')).toBe('milky-way')
    expect(getSkillIcon('know-arch-eng')).toBe('classical-building')
  })

  it('returns an empty string for an unknown skill', () => {
    expect(getSkillIcon('underwater-basket-weaving')).toBe('')
  })
})
