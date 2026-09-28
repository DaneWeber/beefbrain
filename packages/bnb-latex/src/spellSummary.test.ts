import { describe, expect, it } from 'vitest'
import {
  buildCastingTableRows,
  buildSpellLevelBlocks,
  formatSpellEntry,
  summarizeSpellcasting,
} from './spellSummary'

describe('formatSpellEntry', () => {
  it('marks a cast spell instead of printing [object Object]', () => {
    expect(formatSpellEntry({ cast: 'Lightfoot' })).toBe('Lightfoot (cast)')
  })

  it('names the domain a domain slot is for', () => {
    expect(formatSpellEntry({ 'sun-domain': 'endure elements' })).toBe(
      'endure elements (Sun Domain)',
    )
  })

  it('leaves a plain name alone', () => {
    expect(formatSpellEntry('Blessed Aim [used]')).toBe('Blessed Aim [used]')
  })
})

describe('summarizeSpellcasting', () => {
  it('reads a calculated, class-keyed block', () => {
    const [ranger] = summarizeSpellcasting({
      abilities: { wisdom: [14, { wis: 2 }] },
      spells: {
        ranger: {
          casting: ['divine', 'prepared', 'wis'],
          'caster-level': 3,
          slots: { '1': [2, { ranger: 1, 'wis-slot': 1 }] },
          prepared: { '1': ['Surefoot', { cast: 'Lightfoot' }] },
        },
      },
    })
    expect(ranger).toEqual({
      name: 'Ranger',
      casting: 'Divine, prepared',
      ability: 'Wis',
      casterLevel: '3',
      domains: '',
      listLabel: 'Prepared',
      levels: [
        {
          level: '1',
          perDay: '2',
          // 10 + spell level 1 + Wis +2
          saveDc: '13',
          spells: ['Surefoot', 'Lightfoot (cast)'],
        },
      ],
    })
  })

  it('reads a hand-entered block at the top of spells', () => {
    const [sorcerer] = summarizeSpellcasting({
      spells: {
        'caster-class': 'sorcerer',
        'caster-level': 13,
        'key-ability': 'charisma',
        'spells-per-day': { '0': 6, '1': 8 },
        'save-dc': { '0': 16, '1': 17 },
        'spells-known': { '0': ['Light'], '1': ['Magic Missile'] },
      },
    })
    expect(sorcerer.name).toBe('Sorcerer')
    expect(sorcerer.casting).toBe('Spontaneous')
    expect(sorcerer.ability).toBe('Cha')
    expect(sorcerer.listLabel).toBe('Known')
    expect(sorcerer.levels).toEqual([
      { level: '0', perDay: '6', saveDc: '16', spells: ['Light'] },
      { level: '1', perDay: '8', saveDc: '17', spells: ['Magic Missile'] },
    ])
  })

  it('reads a hand-entered block under a class key, skipping special spells', () => {
    const casters = summarizeSpellcasting({
      spells: {
        cleric: {
          'key-ability': 'wisdom',
          domains: ['Good', 'Trickery'],
          'spells-per-day': { '1': '7+1D' },
          'spells-prepared': { '1': ['Bless'] },
        },
        'special-spells': [{ spell: 'Vision of Heaven', level: 1 }],
      },
    })
    expect(casters).toHaveLength(1)
    expect(casters[0].domains).toBe('Good, Trickery')
    expect(casters[0].levels[0].perDay).toBe('7+1D')
  })

  it('reads a bare list as spells of unknown level', () => {
    const [ranger] = summarizeSpellcasting({
      spells: { ranger: ['Jump (p. 246)'] },
    })
    expect(ranger.levels).toEqual([
      { level: '', perDay: '', saveDc: '', spells: ['Jump (p. 246)'] },
    ])
  })

  it('finds no casters on a sheet without spells', () => {
    expect(summarizeSpellcasting({})).toEqual([])
    expect(buildCastingTableRows([])).toBe('\\castingnone')
    expect(buildSpellLevelBlocks([])).toBe('')
  })
})

describe('spell tables', () => {
  const casters = summarizeSpellcasting({
    spells: {
      cleric: {
        'key-ability': 'wisdom',
        'spells-prepared': { '1': ['Bless', 'Protection from Evil & Good'] },
      },
      wizard: {
        'key-ability': 'intelligence',
        'spells-prepared': { '0': ['Light'] },
      },
    },
  })

  it('writes one escaped casting row per class', () => {
    expect(buildCastingTableRows(casters)).toBe(
      [
        '\\castingrow{Cleric}{Prepared}{Wis}{}{}',
        '\\castingrow{Wizard}{Prepared}{Int}{}{}',
      ].join('\n'),
    )
  })

  it('writes a block per class, each after a rule', () => {
    expect(buildSpellLevelBlocks(casters)).toBe(
      [
        '\\blockrule',
        '\\begin{spelllevels}{Cleric}{Prepared}',
        '\\spelllevelrow{1}{}{}{Bless, Protection from Evil \\& Good}',
        '\\end{spelllevels}',
        '\\blockrule',
        '\\begin{spelllevels}{Wizard}{Prepared}',
        '\\spelllevelrow{0}{}{}{Light}',
        '\\end{spelllevels}',
      ].join('\n'),
    )
  })
})
