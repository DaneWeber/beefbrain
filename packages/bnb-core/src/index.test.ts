import { describe, it, expect } from '@jest/globals'
import { parse as parseYAML } from 'yaml'
import { validateBeefBrainData, updateCalculatedFields } from './index'

describe('Beef Brain Core', () => {
  describe('validateBeefBrainData', () => {
    it('should validate a basic YAML structure', () => {
      const yamlContent = `---
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
        const yamlContent = `---
character: abilities: strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
        expect(validateBeefBrainData(yamlContent)).toBe(false)
      })
      it('should invalidate bad indentation', () => {
        const yamlContent = `---
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
    it('should return the same content when no change is necessary', () => {
      const yamlContent = `---
character:
  abilities:
    strength: [15, str: 2, {base: 11, orc: 2, hd: 2}]
`
      expect(updateCalculatedFields(yamlContent)).toBe(yamlContent)
    })
    it('should fail on invalid YAML', () => {
      const yamlContent = `---
character: abilities: strength: [15, str: 2, { base: 11, orc: 2, hd: 2 }]
`
      expect(() => updateCalculatedFields(yamlContent)).toThrowError()
    })
    describe('DnD 3.5e specific tests', () => {
      describe('strength modifier propagation', () => {
        it('should update melee attack bonus and weapon damage in combat', () => {
          const yamlContent = `---
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
          const yamlContent = `---
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
          const yamlContent = `---
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
          const yamlContent = `---
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
          const yamlContent = `---
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
          const yamlContent = `---
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
          const yamlContent = `---
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
      describe('constitution modifier propagation', () => {
        it('should update fortitude save based on constitution', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [16, con: 0]
  combat:
    saves:
      fortitude: [2, {fighter: 2, con: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.combat.saves.fortitude[1].con).toBe(3)
          expect(output.character.combat.saves.fortitude[0]).toBe(5)
        })
        it('should update max-hp based on constitution', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [16, con: 0]
  levels:
    max-hp: [10, {con: 0, rolls: 10}]
    hp: [10, {max-hp: 10, damage: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.levels['max-hp'][1].con).toBe(3)
          expect(output.character.levels['max-hp'][0]).toBe(13)
          expect(output.character.levels.hp[1]['max-hp']).toBe(13)
          expect(output.character.levels.hp[0]).toBe(13)
        })
        it('should update concentration skill based on constitution', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [16, con: 0]
  skills:
    concentration: [0, con: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.skills.concentration[1].con).toBe(3)
          expect(output.character.skills.concentration[0]).toBe(3)
        })
      })
      describe('wisdom modifier propagation', () => {
        it('should update will save based on wisdom', () => {
          const yamlContent = `---
character:
  abilities:
    wisdom: [16, wis: 0]
  combat:
    saves:
      will: [0, {cleric: 2, wis: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.combat.saves.will[1].wis).toBe(3)
          expect(output.character.combat.saves.will[0]).toBe(5)
        })
        it('should update wisdom-based skills', () => {
          const yamlContent = `---
character:
  abilities:
    wisdom: [16, wis: 0]
  skills:
    heal: [0, wis: 0]
    listen: [0, wis: 0]
    spot: [2, {wis: 0, ranks: 2}]
    sense-motive: [0, wis: 0]
    survival: [0, wis: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.skills.heal[1].wis).toBe(3)
          expect(output.character.skills.heal[0]).toBe(3)
          expect(output.character.skills.spot[1].wis).toBe(3)
          expect(output.character.skills.spot[0]).toBe(5)
        })
      })
      describe('intelligence modifier propagation', () => {
        it('should update intelligence-based skills', () => {
          const yamlContent = `---
character:
  abilities:
    intelligence: [16, int: 0]
  skills:
    appraise: [2, {int: 0, ranks: 2}]
    search: [0, int: 0]
    forgery: [0, int: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.skills.appraise[1].int).toBe(3)
          expect(output.character.skills.appraise[0]).toBe(5)
          expect(output.character.skills.search[1].int).toBe(3)
          expect(output.character.skills.search[0]).toBe(3)
        })
      })
      describe('charisma modifier propagation', () => {
        it('should update charisma-based skills', () => {
          const yamlContent = `---
character:
  abilities:
    charisma: [16, cha: 0]
  skills:
    bluff: [0, cha: 0]
    diplomacy: [0, cha: 0]
    intimidate: [4, {cha: 0, ranks: 4}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.skills.bluff[1].cha).toBe(3)
          expect(output.character.skills.bluff[0]).toBe(3)
          expect(output.character.skills.intimidate[1].cha).toBe(3)
          expect(output.character.skills.intimidate[0]).toBe(7)
        })
      })
      describe('defense propagation', () => {
        it('should update AC, touch AC, and flat-footed AC from dex', () => {
          const yamlContent = `---
character:
  abilities:
    dexterity: [16, dex: 0]
  combat:
    defense:
      ac: [10, {base: 10, dex: 0}]
      touch-ac: [10, {base: 10, dex: 0}]
      flat-footed-ac: [10, base: 10]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.combat.defense.ac[1].dex).toBe(3)
          expect(output.character.combat.defense.ac[0]).toBe(13)
          expect(output.character.combat.defense['touch-ac'][1].dex).toBe(3)
          expect(output.character.combat.defense['touch-ac'][0]).toBe(13)
          // Flat-footed should not include positive dex
          expect(output.character.combat.defense['flat-footed-ac'][0]).toBe(10)
        })
        it('should include negative dex in flat-footed AC', () => {
          const yamlContent = `---
character:
  abilities:
    dexterity: [5, dex: 0]
  combat:
    defense:
      ac: [10, {base: 10, dex: 0}]
      touch-ac: [10, {base: 10, dex: 0}]
      flat-footed-ac: [10, base: 10]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.combat.defense.ac[1].dex).toBe(-3)
          expect(output.character.combat.defense.ac[0]).toBe(7)
          // Flat-footed uses spread format: [total, {base: 10}, {dex: -3}]
          expect(output.character.combat.defense['flat-footed-ac'][0]).toBe(7)
          expect(output.character.combat.defense['flat-footed-ac'][2].dex).toBe(-3)
        })
      })
      describe('equipment-derived defense stats', () => {
        it('should derive AC from equipped armor and shield', () => {
          const yamlContent = `---
character:
  abilities:
    dexterity: [14, dex: 2]
  combat:
    defense:
      ac: [10, {base: 10, dex: 0}]
      touch-ac: [10, {base: 10, dex: 0}]
      flat-footed-ac: [10, base: 10]
      acp: [0, none: 0]
      max-dex: [99, none: 99]
  movement:
    load: [30 lbs, {equipped: 30 lbs}]
    capacity: {light: 58 lbs, medium: 116 lbs, heavy: 175 lbs, lift: 350 lbs, drag: 875 lbs}
  inventory:
    _on: [equipped]
    equipped:
      - [chain shirt, 1, armor, 25 lbs, 100 gp, {ac: 5, max-dex: 4, acp: -2, asfc: 20%}]
      - [heavy steel shield, 1, shield, 15 lbs, 30 gp, {ac: 2, acp: -2, asfc: 15%}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.combat.defense.ac[0]).toBe(19)
          expect(output.character.combat.defense.ac[1].armor).toBe(5)
          expect(output.character.combat.defense.ac[1].shield).toBe(2)
          expect(output.character.combat.defense.ac[1].dex).toBe(2)
          expect(output.character.combat.defense['touch-ac'][0]).toBe(12)
          expect(output.character.combat.defense['flat-footed-ac'][0]).toBe(17)
        })
        it('should cap dex in AC at max-dex from armor', () => {
          const yamlContent = `---
character:
  abilities:
    dexterity: [20, dex: 5]
  combat:
    defense:
      ac: [10, {base: 10, dex: 0}]
      touch-ac: [10, {base: 10, dex: 0}]
      flat-footed-ac: [10, base: 10]
      acp: [0, none: 0]
      max-dex: [99, none: 99]
  movement:
    load: [20 lbs, {equipped: 20 lbs}]
    capacity: {light: 100 lbs, medium: 200 lbs, heavy: 300 lbs, lift: 600 lbs, drag: 1500 lbs}
  inventory:
    _on: [equipped]
    equipped:
      - [full plate, 1, armor, 50 lbs, 1500 gp, {ac: 8, max-dex: 1, acp: -6, asfc: 35%}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Dex mod is +5 but max-dex from armor is 1
          expect(output.character.combat.defense.ac[1].dex).toBe(1)
          expect(output.character.combat.defense.ac[0]).toBe(19) // 10 + 8 + 1
          // Touch AC still uses capped dex
          expect(output.character.combat.defense['touch-ac'][0]).toBe(11) // 10 + 1
        })
        it('should derive ACP from equipment when worse than load', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [14, str: 2]
  combat:
    defense:
      ac: [10, {base: 10, dex: 0}]
      acp: [0, none: 0]
      max-dex: [99, none: 99]
  movement:
    load: [75.5 lbs, {equipped: 49 lbs, pack: 26.5 lbs}]
    capacity: {light: 58 lbs, medium: 116 lbs, heavy: 175 lbs, lift: 350 lbs, drag: 875 lbs}
  inventory:
    _on: [equipped]
    equipped:
      - [chain shirt, 1, armor, 25 lbs, 100 gp, {ac: 5, max-dex: 4, acp: -2, asfc: 20%}]
      - [heavy steel shield, 1, shield, 15 lbs, 30 gp, {ac: 2, acp: -2, asfc: 15%}]
  skills:
    climb: [3, {str: 2, acp: -3, ranks: 4}]
    swim: [-4, {str: 2, acp: -6}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Equipment ACP: -2 + -2 = -4, load ACP: -3 (medium). Equipment worse.
          expect(output.character.combat.defense.acp[0]).toBe(-4)
          // Skills should use equipment ACP (-4), swim double (-8)
          expect(output.character.skills.climb[1].acp).toBe(-4)
          expect(output.character.skills.swim[1].acp).toBe(-8)
        })
      })
      it('should calculate the correct strength without modifiers', () => {
        const yamlContent = `---
character:
  abilities:
    strength: [99, str: 99, { base: 10 }]
`
        const expected = parseYAML(`---
character:
  abilities:
    strength: [10, str: 0, { base: 10 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate the lowest strength without modifiers', () => {
        const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0, { base: 1 }]
`
        const expected = parseYAML(`---
character:
  abilities:
    strength: [1, str: -5, { base: 1 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate the first negative modifier', () => {
        const yamlContent = `---
character:
  abilities:
    strength: [0, str: 0, { base: 9 }]
`
        const expected = parseYAML(`---
character:
  abilities:
    strength: [9, str: -1, { base: 9 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate add multiple score components', () => {
        const yamlContent = `---
character:
  abilities:
    strength: [0, str: 0, { base: 7, orc: 2, hd: 2, gloves: 1 }]
`
        const expected = parseYAML(`---
character:
  abilities:
    strength: [12, str: 1, { base: 7, orc: 2, hd: 2, gloves: 1 }]
`)
        expect(parseYAML(updateCalculatedFields(yamlContent))).toEqual(expected)
      })
      it('should calculate all six abilities with only base values', () => {
        const yamlContent = `---
character:
  abilities:
    strength: [0, str: 0, { base: 1 }]
    dexterity: [0, dex: 0, { base: 5 }]
    constitution: [0, con: 0, { base: 6 }]
    intelligence: [0, int: 0, { base: 10 }]
    wisdom: [0, wis: 0, { base: 11 }]
    charisma: [0, cha: 0, { base: 18 }]
`
        const expected = parseYAML(`---
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
        const yamlContent = `---
character:
  abilities:
    strength: [1, str: 0]
    dexterity: [5, dex: 0]
    constitution: [6, con: 0]
    intelligence: [10, int: 0]
    wisdom: [11, wis: 0]
    charisma: [18, cha: 0]
`
        const expected = parseYAML(`---
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
        const yamlContent = `---
character:
  abilities:
    strength: [0, str: 0, {base: 1, orc: 4, hd: 2, belt: 4}]
    dexterity: [0, dex: 0, {base: 5, gloves: 2}]
    constitution: [0, con: 0, {base: 6, inherent: 1}]
    intelligence: [0, int: 0, {base: 10, orc: -2, crown: 2}]
    wisdom: [0, wis: 0, {base: 11, orc: -2}]
    charisma: [0, cha: 0, {base: 18, orc: -2, cloak: 4}]
`
        const expectedYaml = `---
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

  describe('Mutants & Masterminds 3e specific tests', () => {
    it('should calculate power points assigned from abilities', () => {
      const { evaluateFormula } = require('./calculationEngine')

      const rootData = {
        character: {
          abilities: {
            strength: 4,
            stamina: 5,
            agility: 3,
            dexterity: 2,
            fighting: 5,
            intellect: 2,
            awareness: 3,
            presence: 4,
          },
          level: {
            'power-level': 10,
            'power-points-assigned': 0,
            'power-points-available': 118,
          },
        },
      }

      // Test the formula evaluation directly
      const formula = '2 * sum(abilityScores)'
      const variables = { abilityScores: '.character.abilities[]' }
      const context = {
        root: rootData,
      }

      const calculated = evaluateFormula(formula, variables, context)

      // Sum of abilities: 4+5+3+2+5+2+3+4 = 28, times 2 = 56
      expect(calculated).toBe(56)
    })
  })
})
