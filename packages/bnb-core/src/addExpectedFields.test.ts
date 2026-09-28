import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect } from 'vitest'
import { parse as parseYAML } from 'yaml'
import { addExpectedFields } from './addExpectedFields'
import { DND35_CORE_SKILLS } from './dnd35Skills'

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
    ).skills as Record<
      string,
      {
        ability?: string
        'trained-only'?: boolean
        'armor-penalty'?: true | 'double'
      }
    >

    expect(
      DND35_CORE_SKILLS.map(({ name, ability, trainedOnly, armorPenalty }) => ({
        name,
        ability,
        trainedOnly: !!trainedOnly,
        armorPenalty,
      })),
    ).toEqual(
      Object.entries(catalog).map(([name, skill]) => ({
        name,
        ability: skill.ability,
        trainedOnly: !!skill['trained-only'],
        armorPenalty: skill['armor-penalty'],
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
      '_acp',
      ...DND35_CORE_SKILLS.map((skill) => skill.name),
    ])
    expect(skills._acp).toEqual([0])
    expect(skills.climb).toEqual([6, { str: 6, acp: 0 }])
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
    ).toContain('tumble: [.nan, {dex: 1, acp: 0, not-trained: .nan}]')
  })

  it('applies the existing ACP to new armor-penalty skills, doubled for swim', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    _acp: [-4, {armor: -2, shield: -2}]
    climb: [15, {str: 6, ranks: [13, fighter: 13], acp: -4}]
`),
    )

    expect(skills._acp).toEqual([-4, { armor: -2, shield: -2 }])
    expect(skills.balance).toEqual([-3, { dex: 1, acp: -4 }])
    expect(skills.swim).toEqual([-2, { str: 6, acp: -8 }])
    expect(skills['sleight-of-hand']).toEqual([
      NaN,
      { dex: 1, acp: -4, 'not-trained': NaN },
    ])
    expect(skills.bluff).toEqual([-1, { cha: -1 }])
  })

  it('moves a legacy combat.defense.acp to skills._acp', () => {
    const parsed = parseYAML(
      addExpectedFields(`---
character:
${ABILITIES}  combat:
    defense:
      ac: [10, base: 10]
      acp: [-3, armor: -3]
  skills:
    _points: [5, fighter: 5]
`),
    )

    expect(parsed.character.combat.defense).not.toHaveProperty('acp')
    expect(Object.keys(parsed.character.skills).slice(0, 2)).toEqual([
      '_points',
      '_acp',
    ])
    expect(parsed.character.skills._acp).toEqual([-3, { armor: -3 }])
    expect(parsed.character.skills.hide).toEqual([-2, { dex: 1, acp: -3 }])
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

    expect(Object.keys(skills)).toHaveLength(DND35_CORE_SKILLS.length + 1)
  })

  it('falls back to the ability score when the modifier is not listed', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
  abilities:
    strength: [15]
`),
    )

    expect(skills.climb).toEqual([2, { str: 2, acp: 0 }])
    expect(skills.hide).toEqual([0, { dex: 0, acp: 0 }])
  })

  it('returns its own output unchanged, since nothing is missing any more', () => {
    const filled = addExpectedFields(`---
character:
${ABILITIES}  skills:
    _acp: [-2, armor: -2]
    climb: [4, {str: 6}]
    open-lock: [3, dex: 1]
    know-arcana: [0, int: 0]
`)
    expect(addExpectedFields(filled)).toBe(filled)
  })

  it('adds a forgotten acp to existing armor-penalty skills, doubled for swim', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    _acp: [-4, {armor: -2, shield: -2}]
    climb: [19, {str: 6, ranks: [13, fighter: 13]}]
    swim: [6, str: 6]
    tumble: [7, {dex: 1, ranks: 6, acp: -2}]
    bluff: [-1, cha: -1]
`),
    )

    expect(skills.climb).toEqual([
      15,
      { str: 6, ranks: [13, { fighter: 13 }], acp: -4 },
    ])
    expect(skills.swim).toEqual([-2, { str: 6, acp: -8 }])
    // A skill that already has acp is left for the calculation to update.
    expect(skills.tumble).toEqual([7, { dex: 1, ranks: 6, acp: -2 }])
    expect(skills.bluff).toEqual([-1, { cha: -1 }])
  })

  it('marks existing trained-only skills without ranks as not-trained', () => {
    const skills = skillsOf(
      addExpectedFields(`---
character:
${ABILITIES}  skills:
    disable-device: [0, int: 0]
    open-lock: [1, {dex: 1, ranks: 0}]
    sleight-of-hand: [1, dex: 1]
    knowledge-nature: [0, int: 0]
    know-arcana: [4, {int: 0, ranks: [4, wizard: 4]}]
    profession-fisherman: [1, {wis: -1, ranks: 2}]
    appraise: [0, int: 0]
`),
    )

    expect(skills['disable-device']).toEqual([
      NaN,
      { int: 0, 'not-trained': NaN },
    ])
    expect(skills['open-lock']).toEqual([
      NaN,
      { dex: 1, ranks: 0, 'not-trained': NaN },
    ])
    expect(skills['sleight-of-hand']).toEqual([
      NaN,
      { dex: 1, acp: 0, 'not-trained': NaN },
    ])
    expect(skills['knowledge-nature']).toEqual([
      NaN,
      { int: 0, 'not-trained': NaN },
    ])
    expect(skills['know-arcana']).toEqual([
      4,
      { int: 0, ranks: [4, { wizard: 4 }] },
    ])
    expect(skills['profession-fisherman']).toEqual([1, { wis: -1, ranks: 2 }])
    expect(skills.appraise).toEqual([0, { int: 0 }])
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
