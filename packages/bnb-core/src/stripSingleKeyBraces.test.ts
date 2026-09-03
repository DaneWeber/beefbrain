import { describe, it, expect } from 'vitest'
import { stripSingleKeyBraces } from './stripSingleKeyBraces'

describe('stripSingleKeyBraces', () => {
  it('strips a single-key map with a scalar value', () => {
    expect(stripSingleKeyBraces('[14, {str: 2}]')).toBe('[14, str: 2]')
  })

  it('leaves multi-key maps untouched', () => {
    const input = '[18, {base: 10, dex: 1, armor: 5, shield: 2}]'
    expect(stripSingleKeyBraces(input)).toBe(input)
  })

  it('leaves empty maps untouched', () => {
    const input = '[4, str: 2, {}, [longsword]]'
    expect(stripSingleKeyBraces(input)).toBe(input)
  })

  it('strips a single-key map whose value is a comma-bearing array', () => {
    expect(
      stripSingleKeyBraces('[3, {hp: [10, 8, 7]}, {hd: 10, bab: good}]'),
    ).toBe('[3, hp: [10, 8, 7], {hd: 10, bab: good}]')
  })

  it('strips a single-key map whose value is a nested [total, {components}] pair', () => {
    expect(
      stripSingleKeyBraces('[1/day, {dc: [19, {base: 13, cha: 6}]}]'),
    ).toBe('[1/day, dc: [19, {base: 13, cha: 6}]]')
  })

  it('does not treat an unquoted apostrophe/quote mid-scalar as opening a string', () => {
    const input = 'height: 6\' 0"\nweight: 200 lbs'
    expect(stripSingleKeyBraces(input)).toBe(input)
  })

  it('skips commas and braces inside quoted scalars', () => {
    const input = '[3, {bab: 1, str: 2}, ["Note: has, a comma and a { brace"]]'
    expect(stripSingleKeyBraces(input)).toBe(input)
  })

  it('is a no-op when there is nothing to strip', () => {
    const input = 'character:\n  description:\n    name: Landorf'
    expect(stripSingleKeyBraces(input)).toBe(input)
  })
})
