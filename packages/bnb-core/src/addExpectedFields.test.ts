import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parse as parseYAML } from 'yaml'
import { addExpectedFields, DND35_CORE_SKILLS } from './addExpectedFields'

const ABILITIES = `  abilities:
    strength: [22, str: 6, {base: 18, belt-enhancement: 4}]
    dexterity: [12, dex: 1]
    constitution: [14, con: 2]
    intelligence: [10, int: 0]
    wisdom: [9, wis: -1]
    charisma: [9, cha: -1]
`

function skillsOf(yaml: string): Record<string, unknown> {
  return parseYAML(yaml).character.skills
}

describe('DND35_CORE_SKILLS', () => {
  it('matches catalogs/dnd35/skills.yaml', () => {
    const catalog = parseYAML(
      readFileSync(
        resolve(__dirname, '../catalogs/dnd35/skills.yaml'),
        'utf-8',
      ),
    ).skills as Record<string, { ability?: string; 'trained-only'?: boolean }>

    expect(
      DND35_CORE_SKILLS.map(({ name, ability, trainedOnly }) => ({
        name,
        ability,
        trainedOnly: !!trainedOnly,
      })),
    ).toEqual(
      Object.entries(catalog).map(([name, skill]) => ({
        name,
        ability: skill.ability,
        trainedOnly: !!skill['trained-only'],
      })),
    )
  })
})

describe('addExpectedFields', () => {
  it('adds every core skill with its ability modifier', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    _points: [0]
`),
    )

    expect(Object.keys(skills)).toEqual([
      '_points',
      ...DND35_CORE_SKILLS.map((skill) => skill.name),
    ])
    expect(skills.climb).toEqual([6, { str: 6 }])
    expect(skills['sense-motive']).toEqual([-1, { wis: -1 }])
  })

  it('marks trained-only skills without ranks as not-trained', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    spellcraft: [4, {int: 0, ranks: [4, wizard: 4]}]
`),
    )

    expect(skills['open-lock']).toEqual([NaN, { dex: 1, 'not-trained': NaN }])
    expect(skills['speak-language']).toEqual([NaN, { 'not-trained': NaN }])
    expect(skills.spellcraft).toEqual([
      4,
      { int: 0, ranks: [4, { wizard: 4 }] },
    ])
  })

  it('writes not-trained as .nan', () => {
    expect(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    appraise: [0, int: 0]
`),
    ).toContain('tumble: [.nan, {dex: 1, not-trained: .nan}]')
  })

  it('keeps existing skills and their order, inserting missing ones alphabetically', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    _points: [5, fighter: 5]
    swim: [-2, {str: 6, acp: -8}]
    climb: [15, {str: 6, ranks: [13, fighter: 13], acp: -4}]
    heal: [1, {wis: -1, healer-kit: 2}]
`),
    )

    const keys = Object.keys(skills)
    expect(keys[0]).toBe('_points')
    expect(keys.indexOf('swim')).toBeLessThan(keys.indexOf('climb'))
    expect(keys.indexOf('appraise')).toBeLessThan(keys.indexOf('swim'))
    expect(keys.indexOf('use-rope')).toBe(keys.length - 1)
    expect(skills.swim).toEqual([-2, { str: 6, acp: -8 }])
    expect(skills.climb).toEqual([
      15,
      { str: 6, ranks: [13, { fighter: 13 }], acp: -4 },
    ])
    expect(skills.heal).toEqual([1, { wis: -1, 'healer-kit': 2 }])
  })

  it('treats specializations and know-* shorthand as the listed skill', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    craft-traps: [4, {int: 0, ranks: [4, rogue: 4]}]
    know-arcana: [4, {int: 0, ranks: [4, wizard: 4]}]
    perform-reed-flute: [1, {cha: -1, ranks: [2, bard: 2]}]
    profession-fisherman: [1, {wis: -1, ranks: [2, commoner: 2]}]
`),
    )

    expect(skills).not.toHaveProperty('craft')
    expect(skills).not.toHaveProperty('knowledge')
    expect(skills).not.toHaveProperty('perform')
    expect(skills).not.toHaveProperty('profession')
  })

  it('creates the skills section when there is none', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}`),
    )

    expect(Object.keys(skills)).toHaveLength(DND35_CORE_SKILLS.length)
  })

  it('falls back to the ability score when the modifier is not listed', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
  abilities:
    strength: [15]
`),
    )

    expect(skills.climb).toEqual([2, { str: 2 }])
    expect(skills.hide).toEqual([0, { dex: 0 }])
  })

  it('returns the input unchanged when nothing is missing', () => {
    const input = `---
character:
${ABILITIES}  skills:
${DND35_CORE_SKILLS.map((skill) => `    ${skill.name}: [0, int: 0]`).join('\n')}
`
    expect(addExpectedFields(input)).toBe(input)
  })

  it('ignores non-D&D 3.5 characters', () => {
    const input = `---
character:
  abilities:
    strength: 4
    agility: 3
`
    expect(addExpectedFields(input)).toBe(input)
  })

  it('ignores documents without a character', () => {
    expect(addExpectedFields('---\nfoo: bar\n')).toBe('---\nfoo: bar\n')
    expect(addExpectedFields('')).toBe('')
  })
})
