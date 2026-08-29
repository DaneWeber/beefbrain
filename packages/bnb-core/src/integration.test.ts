import { describe, it, expect } from '@jest/globals'
// import { readFileSync, writeFileSync } from 'fs'
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
    describe('dnd35-fighter-1-str.yaml recalculate strength', () => {
      const input = readFileSync(
        __dirname + '/examples/update/dnd35-fighter-1-str.yaml',
        'utf8',
      )
      const expected = readFileSync(
        __dirname + '/examples/final/dnd35-fighter-1.yaml',
        'utf8',
      )
      // Write output for manual inspection
      // writeFileSync(
      //   __dirname + '/ultra-compact-dnd35-fighter-1.yaml',
      //   updateCalculatedFields(input),
      // )

      it('should produce accurately updated output', () => {
        expect(parseYAML(updateCalculatedFields(input))).toEqual(
          parseYAML(expected),
        )
      })
      it('should produce otherwise identical updated output', () => {
        expect(updateCalculatedFields(input)).toEqual(expected)
      })
    })
    describe('dnd35-fighter-1-dex.yaml recalculate dexterity', () => {
      const input = readFileSync(
        __dirname + '/examples/update/dnd35-fighter-1-dex.yaml',
        'utf8',
      )
      const expected = readFileSync(
        __dirname + '/examples/final/dnd35-fighter-1.yaml',
        'utf8',
      )
      // Write output for manual inspection
      // writeFileSync(
      //   __dirname + '/ultra-compact-dnd35-fighter-1.yaml',
      //   updateCalculatedFields(input),
      // )

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

  describe('multiclass character: dnd35-fighter-wizard-5', () => {
    const input = readFileSync(
      __dirname + '/examples/update/dnd35-fighter-wizard-5.yaml',
      'utf8',
    )

    it('should correctly derive all stats for a multiclass character', () => {
      const output = parseYAML(updateCalculatedFields(input))
      const c = output.character

      // Ability scores from components + magic item
      expect(c.abilities.strength[0]).toBe(18) // base 14 + belt 4
      expect(c.abilities.strength[1].str).toBe(4)

      // HD and HP
      expect(c.levels.hd[0]).toBe(5)
      expect(c.levels['max-hp'][0]).toBe(37) // con(5) + rolls(32)
      expect(c.levels.hp[0]).toBe(37)

      // BAB: fighter 3 (good=3) + wizard 2 (poor=1) = 4
      expect(c.combat.attack.bab[0]).toBe(4)

      // Melee with BAB propagated: bab 4 + str 4 = 8
      expect(c.combat.attack.melee._[0]).toBe(8)
      expect(c.combat.attack.melee._[1].bab).toBe(4)

      // Greatsword: attack = generic(8) + special(0) = 8, damage = 2d6+6
      expect(c.combat.attack.melee.greatsword[0]).toBe(8)
      expect(c.combat.attack.melee.greatsword[3]._).toBe(8)
      expect(c.combat.attack.melee.greatsword[1]).toBe('2d6+6 slashing')

      // Saves
      expect(c.combat.saves.fortitude[0]).toBe(4) // fighter(3)+wizard(0)+con(1)
      expect(c.combat.saves.will[0]).toBe(4) // fighter(1)+wizard(3)+wis(0)

      // Defense
      expect(c.combat.defense.ac[0]).toBe(16) // 10+armor(5)+dex(1)
      expect(c.combat.defense.acp[0]).toBe(-2)

      // Synergy
      expect(c.skills.spellcraft[1]['synergy-knowledge-arcana']).toBe(2)
      expect(c.skills.spellcraft[0]).toBe(10)
    })
  })
})
