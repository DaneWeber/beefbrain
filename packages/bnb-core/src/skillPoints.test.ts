import { describe, it, expect } from 'vitest'
import { formatSkillPointMismatch, getSkillPointMismatch } from './skillPoints'

const withSkills = (skills: Record<string, unknown>) => ({
  character: { skills },
})

describe('formatSkillPointMismatch', () => {
  it('names both the distributed and the available totals', () => {
    expect(
      formatSkillPointMismatch({
        fieldName: '_points',
        available: 12,
        distributed: 10,
      }),
    ).toBe(
      'Distributed skill ranks (10) do not match available skill points (12).',
    )
  })
})

describe('getSkillPointMismatch', () => {
  it('reports the mismatch when ranks fall short of available points', () => {
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [12, { fighter: 8, human: 4 }],
          climb: [2, { str: 2, ranks: 4 }],
          jump: [4, { str: 2, ranks: 2 }],
        }),
      ),
    ).toEqual({ fieldName: '_points', available: 12, distributed: 6 })
  })

  it('reports the mismatch when ranks exceed available points', () => {
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [4, { fighter: 4 }],
          climb: [2, { str: 2, ranks: 6 }],
        }),
      ),
    ).toEqual({ fieldName: '_points', available: 4, distributed: 6 })
  })

  it('returns undefined when the totals agree', () => {
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [6, { fighter: 6 }],
          climb: [2, { str: 2, ranks: 4 }],
          jump: [4, { str: 2, ranks: 2 }],
        }),
      ),
    ).toBeUndefined()
  })

  it('reads ranks given as a [total, components] pair', () => {
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [5, { fighter: 5 }],
          climb: [2, { str: 2, ranks: [4, { cc: 2, class: 2 }] }],
        }),
      ),
    ).toEqual({ fieldName: '_points', available: 5, distributed: 4 })
  })

  it('skips underscore-prefixed entries when summing ranks', () => {
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [3, { fighter: 3 }],
          _ranks: [99, { ranks: 99 }],
          climb: [2, { str: 2, ranks: 1 }],
        }),
      ),
    ).toEqual({ fieldName: '_points', available: 3, distributed: 1 })
  })

  it.each([
    ['a skill that is not an array', { bluff: 'cha: -2' }],
    ['a single-element skill array', { bluff: [-2] }],
    ['components that are not a map', { bluff: [-2, ['cha']] }],
    ['components with no ranks', { bluff: [-2, { cha: -2 }] }],
    [
      'ranks that are neither number nor numeric array',
      { bluff: [-2, { ranks: 'two' }] },
    ],
    [
      'ranks given as an array of non-numbers',
      { bluff: [-2, { ranks: ['two'] }] },
    ],
  ])('counts zero ranks for %s', (_label, skill) => {
    expect(
      getSkillPointMismatch(
        withSkills({ _points: [2, { fighter: 2 }], ...skill }),
      ),
    ).toEqual({ fieldName: '_points', available: 2, distributed: 0 })
  })

  it.each([
    ['null data', null],
    ['a non-object', 'character'],
    ['an array', [{ character: {} }]],
    ['data without a character', { creature: {} }],
    ['a non-object character', { character: 'fighter' }],
    ['an array character', { character: [] }],
    ['a character without skills', { character: { abilities: {} } }],
    ['non-object skills', { character: { skills: 'none' } }],
    ['array skills', { character: { skills: [] } }],
    ['skills without _points', withSkills({ climb: [2, { ranks: 2 }] })],
    ['a non-array _points', withSkills({ _points: 12 })],
    ['a _points whose total is not a number', withSkills({ _points: ['12'] })],
  ])('returns undefined for %s', (_label, data) => {
    expect(getSkillPointMismatch(data)).toBeUndefined()
  })
})
