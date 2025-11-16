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
      describe('strength modifier propagation', () => {
        it('should update melee attack bonus and weapon damage in combat', () => {
          const yamlContent = `
---
character:
  abilities:
    strength: [18, str: 4]
  combat:
    attack:
      melee:
        _:
          - 3
          - bab: 1
            str: 2
          - [blind-fight]
        longsword:
          - 4
          - 1d8+2 slashing
          - 19-20/x2
          - _: 2
            special: 1
          - str: 2
          - {}
          - [longsword, weapon-focus-longsword]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update all str: 2 to str: 4 and 1d8+2 slashing to 1d8+4 slashing
          expect(output.character.combat.attack.melee._[1].str).toBe(4)
          expect(output.character.combat.attack.melee._[0]).toBe(5)
          expect(output.character.combat.attack.melee.longsword[3]._).toBe(5)
          expect(output.character.combat.attack.melee.longsword[0]).toBe(6)
          expect(output.character.combat.attack.melee.longsword[4].str).toBe(4)
          expect(output.character.combat.attack.melee.longsword[1]).toBe(
            '1d8+4 slashing',
          )
        })
        it('should update carrying capacity in movement', () => {
          const yamlContent = `
---
character:
  abilities:
    strength: [18, str: 4]
  movement:
    capacity:
      light: 66 lbs
      medium: 133 lbs
      heavy: 200 lbs
      lift: 400 lbs
      drag: 1000 lbs
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update capacity values based on new strength
          expect(output.character.movement.capacity.light).toBe('100 lbs')
          expect(output.character.movement.capacity.medium).toBe('200 lbs')
          expect(output.character.movement.capacity.heavy).toBe('300 lbs')
          expect(output.character.movement.capacity.lift).toBe('600 lbs')
          expect(output.character.movement.capacity.drag).toBe('1500 lbs')
        })
        it('should update skill bonuses that depend on strength', () => {
          const yamlContent = `
---
character:
  abilities:
    strength: [18, str: 4]
  skills:
    climb: [3, {str: 2, acp: -3, ranks: 4}]
    jump: [-1, {str: 2, acp: -3}]
    swim: [-4, {str: 2, acp: -6}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update all str: 2 to str: 4 in skills
          expect(output.character.skills.climb[0]).toBe(5)
          expect(output.character.skills.climb[1].str).toBe(4)
          expect(output.character.skills.jump[0]).toBe(1)
          expect(output.character.skills.jump[1].str).toBe(4)
          expect(output.character.skills.swim[0]).toBe(-2)
          expect(output.character.skills.swim[1].str).toBe(4)
        })
      })
      describe('dexterity modifier propagation', () => {
        it('should update ranged attack bonus', () => {
          const yamlContent = `
---
character:
  abilities:
    dexterity: [15, dex: -4]
  combat:
    attack:
      ranged:
        _:
          - -3
          - bab: 1
            dex: -4
          - [blind-fight]
        shortbow:
          - -2
          - 1d6 piercing
          - 19-20/x2
          - _: -3
            mw: 1
          - {}
          - {}
          - [shortbow, mw]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update all dex to dex: 2
          expect(output.character.combat.attack.ranged._[1].dex).toBe(2)
          expect(output.character.combat.attack.ranged._[0]).toBe(3)
          expect(output.character.combat.attack.ranged.shortbow[3]._).toBe(3)
          expect(output.character.combat.attack.ranged.shortbow[0]).toBe(4)
          expect(output.character.combat.attack.ranged.shortbow[1]).toBe(
            '1d6 piercing',
          )
        })
        it('should update skill bonuses that depend on dexterity', () => {
          const yamlContent = `
---
character:
  abilities:
    dexterity: [15, dex: 0]
  skills:
    balance: [-7, {dex: -4, acp: -3}]
    hide: [-7, {dex: -4, acp: -3, ranks: 2}]
    ride: [-4, dex: -4]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update all dex to dex: 2 in skills
          expect(output.character.skills.balance[0]).toBe(-1)
          expect(output.character.skills.balance[1].dex).toBe(2)
          expect(output.character.skills.hide[0]).toBe(1)
          expect(output.character.skills.hide[1].dex).toBe(2)
          expect(output.character.skills.ride[0]).toBe(2)
          expect(output.character.skills.ride[1].dex).toBe(2)
        })
        it('should update initiative based on dexterity', () => {
          const yamlContent = `
---
character:
  abilities:
    dexterity: [15, dex: 0]
  combat:
    initiative: [-4, dex: -4]
    saves:
      fortitude: [1, {rogue: 0, con: 1}]
      reflex: [-2, {rogue: 2, dex: -4}]
      will: [-1, {rogue: 0, wis: -1}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update initiative dex to dex: 2
          expect(output.character.combat.initiative[0]).toBe(2)
          expect(output.character.combat.initiative[1].dex).toBe(2)
        })
        it('should reflex save based on dexterity', () => {
          const yamlContent = `
---
character:
  abilities:
    dexterity: [15, dex: 0]
  combat:
    initiative: [-4, dex: -4]
    saves:
      fortitude: [1, {rogue: 0, con: 1}]
      reflex: [-2, {rogue: 2, dex: -4}]
      will: [-1, {rogue: 0, wis: -1}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Should update reflex save dex to dex: 2
          expect(output.character.combat.saves.reflex[0]).toBe(4)
          expect(output.character.combat.saves.reflex[1].dex).toBe(2)
        })
      })
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
