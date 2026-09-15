import { describe, it, expect } from 'vitest'
import { formatSkillPointMismatch, getSkillPointMismatch } from './skillPoints'

/**
 * Points and ranks are NOT the same currency: a rank costs one point in a
 * class skill and two in a cross-class skill, so the cost depends on which
 * class bought the rank and whether the skill is a class skill for it.
 * `getSkillPointMismatch` currently ignores that and compares the `_points`
 * total against the sum of per-skill rank totals, which is only correct when
 * every rank was bought at 1:1.
 *
 * The tests below therefore CHARACTERIZE the current implementation; they do
 * not assert that the 1:1 comparison is the right rule. A future change that
 * prices ranks per class is expected to rewrite the expectations here rather
 * than be blocked by them — see `describe('known limitations')` at the bottom.
 */

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

  it('stays silent when every rank was bought at one point each', () => {
    // All-class-skill purchases are the one case where points and rank totals
    // legitimately coincide, so this is the narrow case the current rule fits.
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

  it('takes the rank total, not the per-class breakdown, from a [total, {by-class}] pair', () => {
    // Real data nests the buying classes under `ranks`, as in
    // `spot: [15, {wis: 3, ranks: [10, {dragon: 8, psionic-fist: 2}]}]`.
    // Only the leading total is read; the breakdown is ignored today.
    expect(
      getSkillPointMismatch(
        withSkills({
          _points: [12, { dragon: 10, 'psionic-fist': 2 }],
          spot: [15, { wis: 3, ranks: [10, { dragon: 8, 'psionic-fist': 2 }] }],
        }),
      ),
    ).toEqual({ fieldName: '_points', available: 12, distributed: 10 })
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

/**
 * These record behavior that is believed WRONG, so that the fix has a failing
 * expectation to flip rather than a passing one to discover. Each `toEqual`
 * below should become `toBeUndefined()` once ranks are priced per class.
 */
describe('getSkillPointMismatch known limitations', () => {
  it('warns spuriously when a cross-class rank costs two points', () => {
    // A cross-class rank costs 2 points, so 4 points buying 2 ranks of bluff
    // is correct bookkeeping -- but rank totals sum to 2 against 4 available.
    const mismatch = getSkillPointMismatch(
      withSkills({
        _points: [4, { dragon: 4 }],
        bluff: [3, { cha: 1, ranks: [2, { dragon: 4 }] }],
      }),
    )

    // Should be undefined: the 4 points are fully and correctly accounted for.
    expect(mismatch).toEqual({
      fieldName: '_points',
      available: 4,
      distributed: 2,
    })
  })

  it('ignores the per-class point breakdown that would reconcile the totals', () => {
    // Summing the by-class values under each `ranks` (8 + 4 = 12) matches
    // `_points` exactly; summing the rank totals (8 + 2 = 10) does not.
    const mismatch = getSkillPointMismatch(
      withSkills({
        _points: [12, { dragon: 12 }],
        climb: [14, { str: 6, ranks: [8, { dragon: 8 }] }],
        bluff: [3, { cha: 1, ranks: [2, { dragon: 4 }] }],
      }),
    )

    expect(mismatch).toEqual({
      fieldName: '_points',
      available: 12,
      distributed: 10,
    })
  })

  it('cannot attribute a mismatch to a class, though _points is tracked per class', () => {
    // `_points` records points per class and each skill records which classes
    // bought its ranks, so a mismatch could name the class that is off. The
    // reported shape carries only two scalars, so that detail is discarded.
    const mismatch = getSkillPointMismatch(
      withSkills({
        _points: [51, { cleric: 36, 'mystic-theurge': 15 }],
        concentration: [
          17,
          { con: 2, ranks: [15, { cleric: 12, 'mystic-theurge': 3 }] },
        ],
      }),
    )

    expect(mismatch).toEqual({
      fieldName: '_points',
      available: 51,
      distributed: 15,
    })
    expect(mismatch).not.toHaveProperty('byClass')
  })
})
