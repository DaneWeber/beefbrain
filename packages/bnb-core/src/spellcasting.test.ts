import { describe, expect, it } from 'vitest'
import {
  bonusSpellSlots,
  getSpellSaveDc,
  getSpellcastingIssues,
  matchesSpellDcCondition,
  parseCastingProfile,
  SpellcastingDataError,
} from './spellcasting'

const character = {
  abilities: {
    intelligence: [13, { int: 1 }],
    wisdom: [14, { wis: 2 }],
    charisma: [20, { cha: 5 }],
  },
  spells: {
    _: {
      'dc-modifiers': [
        [1, 'spell-focus', { school: 'evocation' }],
        [1, 'gnome', { school: 'illusion' }],
        [2, 'winter-magic', { descriptor: 'cold' }],
      ],
    },
    paladin: {
      casting: ['divine', 'prepared', 'wis'],
      slots: { 1: [2, { paladin: 1, 'wis-slot': 1 }] },
      prepared: { 1: ['bless weapon', { cast: 'protection from evil' }] },
    },
    sorcerer: {
      casting: ['arcane', 'spontaneous', 'cha'],
      slots: { 3: [4, { sorcerer: 3, 'cha-slot': 1 }] },
      used: { 3: 2 },
    },
    wizard: {
      casting: ['prepared', 'int'],
      slots: { 3: [2, { wizard: 2, int: 0 }] },
      prepared: { 3: ['fireball', 'haste'] },
    },
  },
}

describe('spellcasting helpers', () => {
  it('parses canonical and legacy casting profiles', () => {
    expect(parseCastingProfile(['arcane', 'spontaneous', 'cha'])).toEqual({
      tradition: 'arcane',
      mode: 'spontaneous',
      ability: 'cha',
    })
    expect(parseCastingProfile(['prepared', 'int'])).toEqual({
      mode: 'prepared',
      ability: 'int',
    })
    expect(parseCastingProfile(['arcane', 'prepared', 'strength'])).toBeNull()
  })

  it('calculates bonus slots, including level zero and high modifiers', () => {
    expect(bonusSpellSlots(5, 0)).toBe(0)
    expect(bonusSpellSlots(5, 1)).toBe(2)
    expect(bonusSpellSlots(5, 3)).toBe(1)
    expect(bonusSpellSlots(1, 2)).toBe(0)
  })

  it('matches supported spell metadata conditions', () => {
    expect(
      matchesSpellDcCondition(
        { school: 'Evocation', descriptor: 'fire' },
        { school: 'evocation', descriptors: ['Fire'] },
      ),
    ).toBe(true)
    expect(
      matchesSpellDcCondition({ school: 'illusion' }, { school: 'evocation' }),
    ).toBe(false)
    expect(
      matchesSpellDcCondition({ unsupported: 'value' }, { school: 'illusion' }),
    ).toBe(false)
  })

  it('derives DCs per caster and applies only matching modifiers', () => {
    expect(
      getSpellSaveDc(character, 'sorcerer', 3, {
        name: 'fireball',
        school: 'evocation',
        descriptors: ['fire'],
      }),
    ).toEqual({
      total: 19,
      base: 10,
      spellLevel: 3,
      ability: 'cha',
      abilityModifier: 5,
      modifiers: [
        {
          value: 1,
          source: 'spell-focus',
          condition: { school: 'evocation' },
        },
      ],
    })

    expect(
      getSpellSaveDc(character, 'wizard', 3, {
        name: 'major image',
        school: 'illusion',
      }).total,
    ).toBe(15)
    expect(
      getSpellSaveDc(character, 'paladin', 1, {
        name: 'bless weapon',
        school: 'transmutation',
      }).total,
    ).toBe(13)
  })

  it('stacks independently matching conditions', () => {
    expect(
      getSpellSaveDc(character, 'sorcerer', 3, {
        school: 'evocation',
        descriptors: ['cold'],
      }).total,
    ).toBe(21)
  })

  it('rejects invalid spellcasting requests explicitly', () => {
    expect(() => getSpellSaveDc(character, 'bard', 1)).toThrow(
      SpellcastingDataError,
    )
    expect(() => getSpellSaveDc(character, 'wizard', -1)).toThrow(
      /non-negative integer/,
    )
  })

  it('reports prepared and used slot overages without changing data', () => {
    const invalid = structuredClone(character)
    invalid.spells.paladin.prepared[1].push('divine favor')
    invalid.spells.sorcerer.used[3] = 5

    expect(getSpellcastingIssues(invalid)).toEqual([
      expect.objectContaining({
        code: 'PREPARED_EXCEEDS_SLOTS',
        caster: 'paladin',
        spellLevel: 1,
        slots: 2,
        actual: 3,
      }),
      expect.objectContaining({
        code: 'USED_EXCEEDS_SLOTS',
        caster: 'sorcerer',
        spellLevel: 3,
        slots: 4,
        actual: 5,
      }),
    ])
  })
})
