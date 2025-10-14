import { describe, it, expect } from '@jest/globals'
import { validateBeefBrainData, updateCalculatedFields, applyModifier } from './index'

describe('Beef Brain Core', () => {
  describe('validateBeefBrainData', () => {
    it('should validate a basic YAML structure', () => {
      const yamlContent = `
version: "1.0"
type: character
data:
  name: "Test Character"
  level: 1
`
      expect(validateBeefBrainData(yamlContent)).toBe(true)
    })

    it('should handle empty content', () => {
      expect(validateBeefBrainData('')).toBe(true) // TODO: Should this be false?
    })
  })

  describe('updateCalculatedFields', () => {
    it('should return the same content for now', () => {
      const yamlContent = `
version: "1.0"
type: character
data:
  name: "Test Character"
  level: 1
`
      expect(updateCalculatedFields(yamlContent)).toBe(yamlContent)
    })
  })

  describe('applyModifier', () => {
    it('should return the same content for now', () => {
      const yamlContent = `
version: "1.0"
type: character
data:
  name: "Test Character"
  level: 1
`
      const modifier = { type: 'ability', target: 'strength', value: 2 }
      expect(applyModifier(yamlContent, modifier)).toBe(yamlContent)
    })
  })
})