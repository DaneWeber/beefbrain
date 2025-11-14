import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { updateCalculatedFields } from './index'

describe('Beef Brain Core Integration', () => {
  it('should produce unchanged output for unchanged input', () => {
    const input = readFileSync(
      __dirname + '/examples/unchanged/dnd35-fighter-1.yaml',
      'utf8',
    )
    const expected = readFileSync(
      __dirname + '/examples/final/dnd35-fighter-1.yaml',
      'utf8',
    )
    expect(updateCalculatedFields(input)).toEqual(expected)
  })

  it('should produce updated output for update input', () => {
    const input = readFileSync(
      __dirname + '/examples/update/dnd35-fighter-1.yaml',
      'utf8',
    )
    const expected = readFileSync(
      __dirname + '/examples/final/dnd35-fighter-1.yaml',
      'utf8',
    )
    expect(updateCalculatedFields(input)).toEqual(expected)
  })
})
