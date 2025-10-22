import { describe, it, expect } from '@jest/globals'
import { parse as parseYAML } from 'yaml'
import {
  validateBeefBrainData,
  updateCalculatedFields,
  applyModifier,
} from './index'

describe('Beef Brain Core', () => {
  describe('validateBeefBrainData', () => {
    it('should validate a basic YAML structure', () => {
      const yamlContent = `
---
character:
  abilities:
    strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
      expect(validateBeefBrainData(yamlContent)).toBe(true)
    })

    it('should handle empty content', () => {
      expect(validateBeefBrainData('')).toBe(true)
    })

    describe('invalid YAML cases', () => {
      it('should invalidate all keys on one line', () => {
        const yamlContent = `
---
character: abilities: strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
        expect(validateBeefBrainData(yamlContent)).toBe(false)
      })
      it('should invalidate bad indentation', () => {
        const yamlContent = `
---
character:
abilities:
  strength: [15, 
    str: 2,
  { base: 11,
  orc: 2,
  hd: 2 }
]
`
        expect(validateBeefBrainData(yamlContent)).toBe(false)
      })
    })
  })

  describe('updateCalculatedFields', () => {
    it('should return the same content for now', () => {
      const yamlContent = `
---
character:
  abilities:
    strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
      expect(updateCalculatedFields(yamlContent)).toBe(yamlContent)
    })
    it('should fail on invalid YAML', () => {
      const yamlContent = `
---
character: abilities: strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
      expect(() => updateCalculatedFields(yamlContent)).toThrowError()
    })
    describe('DnD 3.5e specific tests', () => {
      it('should calculate the correct strength without modifiers', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [99, str: 99, { base: 10 }]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [10, str: 0, { base: 10 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
    })
  })
})
