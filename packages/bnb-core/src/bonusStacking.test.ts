import { describe, expect, it } from 'vitest'
import { bonusType, stackedValues, sumStacked } from './bonusStacking'

describe('bonusStacking', () => {
  it('reads the bonus type from an exact key or a -<type> suffix', () => {
    expect(bonusType('deflection')).toBe('deflection')
    expect(bonusType('vest-resistance')).toBe('resistance')
    expect(bonusType('belt-enhancement')).toBe('enhancement')
    expect(bonusType('weapon-focus')).toBeUndefined()
    expect(bonusType('ranks')).toBeUndefined()
  })

  it('applies only the largest bonus of the same type', () => {
    expect(
      sumStacked({ base: 5, 'armor-resistance': 3, 'vest-resistance': 2 }),
    ).toBe(8)
    expect(
      sumStacked({ base: 5, 'vest-resistance': 2, 'armor-resistance': 3 }),
    ).toBe(8)
  })

  it('stacks bonuses of different types and untyped bonuses', () => {
    expect(
      sumStacked({
        'armor-resistance': 3,
        'belt-enhancement': 4,
        'weapon-focus': 1,
        'greater-weapon-focus': 1,
      }),
    ).toBe(9)
  })

  it('always stacks penalties, even of the same type', () => {
    expect(
      sumStacked({ base: 10, 'curse-enhancement': -2, 'hex-enhancement': -1 }),
    ).toBe(7)
    expect(sumStacked({ 'belt-enhancement': 4, 'curse-enhancement': -2 })).toBe(
      2,
    )
  })

  it('reads the total of nested [total, {...}] components', () => {
    expect(sumStacked({ ranks: [13, { fighter: 13 }], dex: 2 })).toBe(15)
  })

  it('ignores non-numeric values', () => {
    expect(stackedValues(Object.entries({ note: 'x', base: 1 }))).toEqual([1])
  })
})
