import { describe, it, expect } from '@jest/globals'
import { readFileSync } from 'fs'
import { parse as parseYAML } from 'yaml'
import { updateCalculatedFields } from './index'

describe('Beef Brain Core Integration', () => {
  describe('keep file unchanged when updated', () => {
    describe('dnd35-fighter-1.yaml', () => {
      const input = readFileSync(
        __dirname + '/examples/unchanged/dnd35-fighter-1.yaml',
        'utf8',
      )
      const expected = readFileSync(
        __dirname + '/examples/final/dnd35-fighter-1.yaml',
        'utf8',
      )

      it('should produce equivalent output for already-correct input', () => {
        expect(parseYAML(updateCalculatedFields(input))).toEqual(
          parseYAML(updateCalculatedFields(expected)),
        )
      })
      it('should produce identical output for already-correct input', () => {
        expect(updateCalculatedFields(input)).toEqual(expected)
      })
    })
  })

  describe('should produce updated output for update input', () => {
    describe('dnd35-fighter-1.yaml', () => {
      const input = readFileSync(
        __dirname + '/examples/update/dnd35-fighter-1.yaml',
        'utf8',
      )
      const expected = readFileSync(
        __dirname + '/examples/final/dnd35-fighter-1.yaml',
        'utf8',
      )

      it('should produce accurately updated output', () => {
        expect(parseYAML(updateCalculatedFields(input))).toEqual(
          parseYAML(expected),
        )
      })
      it('should produce otherwise identical updated output', () => {
        expect(updateCalculatedFields(input)).toEqual(expected)
      })
    })
  })
})
