import { describe, it, expect } from '@jest/globals'
import { parse as parseYAML } from 'yaml'
import { validateBeefBrainData, updateCalculatedFields } from './index'

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
      it('should calculate the lowest strength without modifiers', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [10, str: 0, { base: 1 }]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [1, str: -5, { base: 1 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate the first negative modifier', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [0, str: 0, { base: 9 }]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [9, str: -1, { base: 9 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate add multiple score components', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [0, str: 0, { base: 7, orc: 2, hd: 2, gloves: 1 }]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [12, str: 1, { base: 7, orc: 2, hd: 2, gloves: 1 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate all six abilities with only base values', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [0, str: 0, { base: 1 }]
    dexterity: [0, dex: 0, { base: 5 }]
    constitution: [0, con: 0, { base: 6 }]
    intelligence: [0, int: 0, { base: 10 }]
    wisdom: [0, wis: 0, { base: 11 }]
    charisma: [0, cha: 0, { base: 18 }]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [1, str: -5, { base: 1 }]
    dexterity: [5, dex: -3, { base: 5 }]
    constitution: [6, con: -2, { base: 6 }]
    intelligence: [10, int: 0, { base: 10 }]
    wisdom: [11, wis: 0, { base: 11 }]
    charisma: [18, cha: 4, { base: 18 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate modifiers with assumed base values', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [1, str: 0]
    dexterity: [5, dex: 0]
    constitution: [6, con: 0]
    intelligence: [10, int: 0]
    wisdom: [11, wis: 0]
    charisma: [18, cha: 0]
`
        const expected = parseYAML(`
---
character:
  abilities:
    strength: [1, str: -5]
    dexterity: [5, dex: -3]
    constitution: [6, con: -2]
    intelligence: [10, int: 0]
    wisdom: [11, wis: 0]
    charisma: [18, cha: 4]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      describe('all six abilities with multiple components', () => {
        const yamlContent = `
---
character:
  abilities:
    strength: [0, str: 0, {base: 1, orc: 4, hd: 2, belt: 4}]
    dexterity: [0, dex: 0, {base: 5, gloves: 2}]
    constitution: [0, con: 0, {base: 6, inherent: 1}]
    intelligence: [0, int: 0, {base: 10, orc: -2, crown: 2}]
    wisdom: [0, wis: 0, {base: 11, orc: -2}]
    charisma: [0, cha: 0, {base: 18, orc: -2, cloak: 4}]
`
        const expectedYaml = `
---
character:
  abilities:
    strength: [11, str: 0, {base: 1, orc: 4, hd: 2, belt: 4}]
    dexterity: [7, dex: -2, {base: 5, gloves: 2}]
    constitution: [7, con: -2, {base: 6, inherent: 1}]
    intelligence: [10, int: 0, {base: 10, orc: -2, crown: 2}]
    wisdom: [9, wis: -1, {base: 11, orc: -2}]
    charisma: [20, cha: 5, {base: 18, orc: -2, cloak: 4}]
`
        it('should calculate all six abilities with multiple components', () => {
          expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(
            parseYAML(expectedYaml),
          )
        })
        it('should preserve the compact formatting', () => {
          expect(updateCalculatedFields(yamlContent)).toEqual(expectedYaml)
        })
      })
    })
  })
})
