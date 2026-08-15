import { describe, it, expect } from '@jest/globals'
import { parse as parseYAML } from 'yaml'
import { validateBeefBrainData, updateCalculatedFields } from './index'
import { evaluateFormula } from './calculationEngine'

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
        it('should apply 1.5x str to two-handed weapon damage', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [18, str: 4]
  combat:
    attack:
      melee:
        _: [5, {bab: 1, str: 4}]
        greatsword: [5, 2d6+4 slashing, 19-20/x2, {_: 5, special: 0}, str: 4, {}, [greatsword, two-handed]]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // 1.5x Str mod of 4 = floor(6) = 6
          expect(output.character.combat.attack.melee.greatsword[1]).toBe(
            '2d6+6 slashing',
          )
        })
        it('should apply 0.5x str to off-hand weapon damage', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [18, str: 4]
  combat:
    attack:
      melee:
        _: [5, {bab: 1, str: 4}]
        dagger: [5, 1d4+2 piercing, 19-20/x2, {_: 5, special: 0}, str: 4, {}, [dagger, off-hand]]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // 0.5x Str mod of 4 = floor(2) = 2
          expect(output.character.combat.attack.melee.dagger[1]).toBe(
            '1d4+2 piercing',
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
    hd: [1, 10]
    max-hp: [10, {con: 0, rolls: 10}]
    hp: [10, {max-hp: 10, damage: 0}]
    fighter: [1, hp: [10], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
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
          expect(output.character.combat.defense['flat-footed-ac'][2].dex).toBe(
            -3,
          )
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
      describe('magic item ability bonuses', () => {
        it('should apply ability bonuses from equipped magic items', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [14, str: 2, {base: 14}]
  inventory:
    _on: [equipped]
    equipped:
      - [belt of giant strength, 1, wondrous, 0 lbs, 4000 gp, {str: 4}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Belt adds str: 4 to components, score = 14 + 4 = 18, mod = 4
          expect(
            output.character.abilities.strength[2]['belt-of-giant-strength'],
          ).toBe(4)
          expect(output.character.abilities.strength[0]).toBe(18)
          expect(output.character.abilities.strength[1].str).toBe(4)
        })
        it('should apply multiple ability bonuses from different items', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0, {base: 10}]
    dexterity: [10, dex: 0, {base: 10}]
  inventory:
    _on: [equipped]
    equipped:
      - [belt of giant strength, 1, wondrous, 0 lbs, 4000 gp, {str: 4}]
      - [gloves of dexterity, 1, wondrous, 0 lbs, 4000 gp, {dex: 2}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.abilities.strength[0]).toBe(14)
          expect(output.character.abilities.strength[1].str).toBe(2)
          expect(output.character.abilities.dexterity[0]).toBe(12)
          expect(output.character.abilities.dexterity[1].dex).toBe(1)
        })
      })
      describe('BAB and save derivation from class levels', () => {
        it('should derive BAB from single class', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0]
  levels:
    fighter: [5, hp: [10, 8, 7, 6, 9], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
  combat:
    attack:
      bab: [0, fighter: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Fighter level 5 = Good BAB = 5
          expect(output.character.combat.attack.bab[1].fighter).toBe(5)
          expect(output.character.combat.attack.bab[0]).toBe(5)
        })
        it('should derive BAB from multiclass', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0]
  levels:
    fighter: [3, hp: [10, 8, 6], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
    wizard: [2, hp: [4, 3], {hd: 4, bab: poor, fort: poor, ref: poor, will: good}]
  combat:
    attack:
      bab: [0, {fighter: 0, wizard: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Fighter 3 (Good) = 3, Wizard 2 (Poor) = 1, total = 4
          expect(output.character.combat.attack.bab[1].fighter).toBe(3)
          expect(output.character.combat.attack.bab[1].wizard).toBe(1)
          expect(output.character.combat.attack.bab[0]).toBe(4)
        })
        it('should derive base saves from class levels', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [10, con: 0]
    dexterity: [10, dex: 0]
    wisdom: [10, wis: 0]
  levels:
    fighter: [5, hp: [10, 8, 7, 6, 9], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
  combat:
    saves:
      fortitude: [0, {fighter: 0, con: 0}]
      reflex: [0, {fighter: 0, dex: 0}]
      will: [0, {fighter: 0, wis: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Fighter 5: Fort=Good=4, Ref=Poor=1, Will=Poor=1
          expect(output.character.combat.saves.fortitude[1].fighter).toBe(4)
          expect(output.character.combat.saves.fortitude[0]).toBe(4)
          expect(output.character.combat.saves.reflex[1].fighter).toBe(1)
          expect(output.character.combat.saves.reflex[0]).toBe(1)
          expect(output.character.combat.saves.will[1].fighter).toBe(1)
          expect(output.character.combat.saves.will[0]).toBe(1)
        })
        it('should derive multiclass saves', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [14, con: 2]
    dexterity: [10, dex: 0]
    wisdom: [12, wis: 1]
  levels:
    fighter: [3, hp: [10, 8, 6], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
    wizard: [2, hp: [4, 3], {hd: 4, bab: poor, fort: poor, ref: poor, will: good}]
  combat:
    saves:
      fortitude: [0, {fighter: 0, wizard: 0, con: 0}]
      reflex: [0, {fighter: 0, wizard: 0, dex: 0}]
      will: [0, {fighter: 0, wizard: 0, wis: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Fighter 3: Fort=Good=3, Ref=Poor=1, Will=Poor=1
          // Wizard 2: Fort=Poor=0, Ref=Poor=0, Will=Good=3
          expect(output.character.combat.saves.fortitude[1].fighter).toBe(3)
          expect(output.character.combat.saves.fortitude[1].wizard).toBe(0)
          expect(output.character.combat.saves.fortitude[0]).toBe(5) // 3+0+2(con)
          expect(output.character.combat.saves.will[1].fighter).toBe(1)
          expect(output.character.combat.saves.will[1].wizard).toBe(3)
          expect(output.character.combat.saves.will[0]).toBe(5) // 1+3+1(wis)
        })
      })
      describe('HP derivation from class entries', () => {
        it('should derive con and rolls for multiclass character', () => {
          const yamlContent = `---
character:
  abilities:
    constitution: [14, con: 2]
  levels:
    hd: [5, 10]
    max-hp: [0, {con: 0, rolls: 0}]
    hp: [0, {max-hp: 0, damage: 0}]
    fighter: [3, hp: [10, 8, 6], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
    wizard: [2, hp: [4, 3], {hd: 4, bab: poor, fort: poor, ref: poor, will: good}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // con = 2 * 5 HD = 10, rolls = 10+8+6+4+3 = 31
          expect(output.character.levels['max-hp'][1].con).toBe(10)
          expect(output.character.levels['max-hp'][1].rolls).toBe(31)
          expect(output.character.levels['max-hp'][0]).toBe(41)
          expect(output.character.levels.hp[1]['max-hp']).toBe(41)
          expect(output.character.levels.hp[0]).toBe(41)
        })
      })
      describe('synergy bonuses', () => {
        it('should apply synergy bonus when source has 5+ ranks', () => {
          const yamlContent = `---
character:
  abilities:
    charisma: [10, cha: 0]
  skills:
    bluff: [5, {cha: 0, ranks: 5}]
    diplomacy: [0, cha: 0]
    intimidate: [0, cha: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Bluff 5+ ranks → +2 synergy to diplomacy and intimidate
          expect(output.character.skills.diplomacy[1]['synergy-bluff']).toBe(2)
          expect(output.character.skills.diplomacy[0]).toBe(2)
          expect(output.character.skills.intimidate[1]['synergy-bluff']).toBe(2)
          expect(output.character.skills.intimidate[0]).toBe(2)
        })
        it('should not apply synergy with less than 5 ranks', () => {
          const yamlContent = `---
character:
  abilities:
    charisma: [10, cha: 0]
  skills:
    bluff: [4, {cha: 0, ranks: 4}]
    diplomacy: [0, cha: 0]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(
            output.character.skills.diplomacy[1]['synergy-bluff'],
          ).toBeUndefined()
          expect(output.character.skills.diplomacy[0]).toBe(0)
        })
      })
      describe('hit dice derivation', () => {
        it('should derive total HD and largest die from class entries', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0]
  levels:
    hd: [0, 0]
    fighter: [3, hp: [10, 8, 6], {hd: 10, bab: good, fort: good, ref: poor, will: poor}]
    wizard: [2, hp: [4, 3], {hd: 4, bab: poor, fort: poor, ref: poor, will: good}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.levels.hd[0]).toBe(5)
          expect(output.character.levels.hd[1]).toBe(10)
        })
      })
      describe('inventory weight calculation', () => {
        it('should calculate total weight from equipped and pack items', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [14, str: 2]
  movement:
    load: [0 lbs, {equipped: 0 lbs, pack: 0 lbs}]
    capacity: {light: 58 lbs, medium: 116 lbs, heavy: 175 lbs, lift: 350 lbs, drag: 875 lbs}
  inventory:
    _on: [equipped, pack]
    equipped:
      - [longsword, 1, weapon, 4 lbs, 15 gp]
      - [chain shirt, 1, armor, 25 lbs, 100 gp, {ac: 5, max-dex: 4, acp: -2}]
    pack:
      - [backpack, 1, container, 2 lbs, 2 gp]
      - [trail rations, 5, supplies, 1 lbs, 0.5 gp]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.movement.load[0]).toBe('36 lbs')
          expect(output.character.movement.load[1].equipped).toBe('29 lbs')
          expect(output.character.movement.load[1].pack).toBe('7 lbs')
        })
      })
      describe('speed derivation', () => {
        it('should derive speed reduction from medium load', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [10, str: 0]
  movement:
    speed: [30, {base: 30}]
    load: [40 lbs, {equipped: 40 lbs}]
    capacity: {light: 33 lbs, medium: 66 lbs, heavy: 100 lbs, lift: 200 lbs, drag: 500 lbs}
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.movement.speed[1]['medium-load']).toBe(-10)
          expect(output.character.movement.speed[0]).toBe(20)
        })
        it('should derive speed reduction from heavy armor', () => {
          const yamlContent = `---
character:
  abilities:
    strength: [18, str: 4]
  movement:
    speed: [30, {base: 30}]
    load: [10 lbs, {equipped: 10 lbs}]
    capacity: {light: 100 lbs, medium: 200 lbs, heavy: 300 lbs, lift: 600 lbs, drag: 1500 lbs}
  inventory:
    _on: [equipped]
    equipped:
      - [full plate, 1, armor, 50 lbs, 1500 gp, {ac: 8, max-dex: 1, acp: -6}, [m, heavy-armor]]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.movement.speed[1]['heavy-armor']).toBe(-10)
          expect(output.character.movement.speed[0]).toBe(20)
        })
      })
      describe('spell slot derivation', () => {
        it('should derive bonus wizard spell slots from intelligence', () => {
          const yamlContent = `---
character:
  abilities:
    intelligence: [16, int: 3]
  spells:
    wizard:
      casting: [prepared, int]
      slots:
        0: [4, wizard: 4]
        1: [4, {wizard: 3, int: 0}]
        2: [3, {wizard: 2, int: 0}]
        3: [2, {wizard: 1, int: 0}]
      prepared:
        0: [detect magic, read magic, light, mage hand]
        1: [magic missile, shield, mage armor, sleep]
        2: [scorching ray, mirror image, web]
        3: [fireball, haste]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Int mod 3: +1 bonus at levels 1, 2, 3
          expect(output.character.spells.wizard.slots[1][1].int).toBe(1)
          expect(output.character.spells.wizard.slots[1][0]).toBe(4) // 3+1
          expect(output.character.spells.wizard.slots[2][1].int).toBe(1)
          expect(output.character.spells.wizard.slots[2][0]).toBe(3) // 2+1
          expect(output.character.spells.wizard.slots[3][1].int).toBe(1)
          expect(output.character.spells.wizard.slots[3][0]).toBe(2) // 1+1
          // Level 0 never gets bonus
          expect(output.character.spells.wizard.slots[0][0]).toBe(4)
        })
        it('should derive bonus cleric spell slots with domain slots', () => {
          const yamlContent = `---
character:
  abilities:
    wisdom: [18, wis: 4]
  spells:
    cleric:
      casting: [prepared, wis]
      domains: [sun, war]
      slots:
        0: [5, cleric: 5]
        1: [5, {cleric: 2, wis: 0, domain: 1}]
        2: [4, {cleric: 2, wis: 0, domain: 1}]
      prepared:
        0: [detect magic, read magic, guidance, light, mending]
        1: [bless, protection from evil, doom, cure light wounds, sun-domain: endure elements]
        2: [bulls strength, bears endurance, hold person, war-domain: spiritual weapon]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Wis mod 4: +1 bonus at levels 1, 2, 3, 4
          expect(output.character.spells.cleric.slots[1][1].wis).toBe(1)
          expect(output.character.spells.cleric.slots[1][1].domain).toBe(1)
          expect(output.character.spells.cleric.slots[1][0]).toBe(4) // 2+1+1
          expect(output.character.spells.cleric.slots[2][1].wis).toBe(1)
          expect(output.character.spells.cleric.slots[2][0]).toBe(4) // 2+1+1
          // Domains preserved
          expect(output.character.spells.cleric.domains).toEqual(['sun', 'war'])
        })
        it('should handle high casting stat with extra bonus slots', () => {
          const yamlContent = `---
character:
  abilities:
    intelligence: [26, int: 8]
  spells:
    wizard:
      casting: [prepared, int]
      slots:
        1: [3, {wizard: 3, int: 0}]
        5: [2, {wizard: 1, int: 0}]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          // Int mod 8: level 1 bonus = floor((8-1)/4)+1 = floor(7/4)+1 = 1+1 = 2
          expect(output.character.spells.wizard.slots[1][1].int).toBe(2)
          expect(output.character.spells.wizard.slots[1][0]).toBe(5) // 3+2
          // level 5 bonus = floor((8-5)/4)+1 = floor(3/4)+1 = 0+1 = 1
          expect(output.character.spells.wizard.slots[5][1].int).toBe(1)
          expect(output.character.spells.wizard.slots[5][0]).toBe(2) // 1+1
        })
        it('should handle sorcerer with known spells', () => {
          const yamlContent = `---
character:
  abilities:
    charisma: [16, cha: 3]
  spells:
    sorcerer:
      casting: [spontaneous, cha]
      slots:
        0: [6, sorcerer: 6]
        1: [7, {sorcerer: 6, cha: 0}]
      known:
        0: [detect magic, read magic, light, mage hand]
        1: [magic missile, shield, grease]
`
          const output = parseYAML(updateCalculatedFields(yamlContent))
          expect(output.character.spells.sorcerer.slots[1][1].cha).toBe(1)
          expect(output.character.spells.sorcerer.slots[1][0]).toBe(7) // 6+1
          // Known list preserved
          expect(output.character.spells.sorcerer.known[1]).toEqual([
            'magic missile',
            'shield',
            'grease',
          ])
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
