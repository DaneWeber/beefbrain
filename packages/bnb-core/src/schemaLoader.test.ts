import { describe, expect, it } from 'vitest'
import { getTypeDefinition, loadSchema } from './schemaLoader'

describe('D&D 3.5 schema metadata', () => {
  const schema = loadSchema('dnd35-character')

  it('keeps legacy and grouped hit-die summaries valid', () => {
    const hitDice = getTypeDefinition(schema, 'HitDice')
    expect(hitDice?.array?.['1']?.oneOf).toEqual(['number', 'HitDiceBySize'])
  })

  it('keeps legacy and split class details valid', () => {
    const classLevel = getTypeDefinition(schema, 'ClassLevel')
    expect(classLevel?.array?.['1']?.oneOf).toEqual([
      'ClassLevelDetails',
      'ClassLevelCharacterData',
    ])
    expect(classLevel?.array?.['2']).toMatchObject({
      type: 'ClassLevelDetails',
      optional: true,
    })
  })

  it('defines the canonical spellcasting surfaces', () => {
    const character = getTypeDefinition(schema, 'Character')
    expect(character?.children).toContainEqual(
      expect.objectContaining({
        name: 'spells',
        type: 'Spellcasting',
        optional: true,
      }),
    )

    const spellcastingClass = getTypeDefinition(schema, 'SpellcastingClass')
    expect(spellcastingClass?.children?.map((child) => child.name)).toEqual([
      'casting',
      'caster-level',
      'slots',
      'prepared',
      'known',
      'used',
      'spellbook',
    ])
  })
})
