import { describe, it, expect } from '@jest/globals'
import { validateBeefBrainData, updateCalculatedFields, applyModifier } from './index'

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

    it('should invalidate incorrect YAML structure', () => {
      const yamlContent = `
---
character: abilities: strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
      expect(validateBeefBrainData(yamlContent)).toBe(false)
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
  })
})