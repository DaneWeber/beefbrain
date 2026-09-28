import { describe, expect, it } from 'vitest'
import {
  editItemFromLines,
  itemEditLines,
  splitItem,
  summarizeItemEffects,
} from './itemTuple'

const belt = [
  "Belt of Giant's Strength +4",
  1,
  'gear',
  '1 lb',
  34,
  {},
  ['magic', 'waist-slot'],
  [['abilities.strength', { 'belt-enhancement': 4 }]],
]

describe('itemTuple', () => {
  it('finds props, tags and effects by shape', () => {
    expect(splitItem(belt)).toEqual({
      head: belt.slice(0, 5),
      props: {},
      tags: ['magic', 'waist-slot'],
      effects: [['abilities.strength', { 'belt-enhancement': 4 }]],
    })
    const noProps = ['Rope', 1, 'gear', '10 lbs', 3, ['mundane']]
    expect(splitItem(noProps).tags).toEqual(['mundane'])
    expect(splitItem(noProps).props).toEqual({})
  })

  it('writes effects as dotted edit lines', () => {
    const shirt = [
      'Chain Shirt',
      1,
      'armor',
      '12.5 lbs',
      14,
      { ac: 9, mist: '7/day' },
      ['magic'],
      [
        ['combat.saves.fortitude', { 'armor-resistance': 3 }],
        ['combat.defense.special', 'Mist: 7/day concealment'],
      ],
    ]
    expect(itemEditLines(shirt)).toEqual([
      'ac: 9',
      'mist: 7/day',
      'combat.saves.fortitude.armor-resistance: 3',
      'combat.defense.special: Mist: 7/day concealment',
    ])
  })

  it('rebuilds props and effects from edit lines', () => {
    const edited = editItemFromLines(belt, {
      'abilities.strength.belt-enhancement': '6',
      'combat.defense.ac.deflection': '1',
      'combat.defense.touch-ac.deflection': '1',
      charges: '3',
    })
    expect(edited).toEqual([
      ...belt.slice(0, 5),
      { charges: 3 },
      ['magic', 'waist-slot'],
      [
        ['abilities.strength', { 'belt-enhancement': 6 }],
        ['combat.defense.ac', { deflection: 1 }],
        ['combat.defense.touch-ac', { deflection: 1 }],
      ],
    ])
  })

  it('drops empty trailing parts and keeps effects it cannot edit', () => {
    const focus = [
      'Evocation Focus',
      1,
      'wondrous',
      '0 lbs',
      5,
      {},
      [],
      [['spells._.dc-modifiers', [1, 'item-focus', { school: 'evocation' }]]],
    ]
    expect(editItemFromLines(focus, {})).toEqual(focus)
    expect(editItemFromLines(belt.slice(0, 5), {})).toEqual(belt.slice(0, 5))
  })

  it('summarizes numeric effect bonuses', () => {
    const ring = [
      'Ring of Protection +1',
      1,
      'gear',
      '0 lbs',
      15,
      {},
      ['magic'],
      [
        ['combat.defense.ac', { deflection: 1 }],
        ['combat.defense.touch-ac', { deflection: 1 }],
      ],
    ]
    expect(summarizeItemEffects(ring)).toEqual(['deflection 1 (ac, touch-ac)'])
    expect(summarizeItemEffects(belt)).toEqual([
      'belt-enhancement 4 (strength)',
    ])
  })
})
