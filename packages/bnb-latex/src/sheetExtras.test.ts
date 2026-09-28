import { describe, expect, it } from 'vitest'
import {
  buildAmmoRows,
  buildLanguageRows,
  buildLevelRows,
  buildMoneyRows,
  buildNoteRows,
  buildSpecialRows,
} from './sheetExtras'

describe('buildSpecialRows', () => {
  it('shows a total with its sources and notes', () => {
    expect(
      buildSpecialRows(
        [['will-vs-mind-affecting', [15, { will: 10, mindarmor: 5 }, '3/day']]],
        { signed: true },
      ),
    ).toBe(
      '\\statrow{}{Will vs. Mind-Affecting}{+15}{Mindarmor +5, Will +10; 3/day}',
    )
  })

  it('reads a speed unsigned, with its notes as sources', () => {
    expect(
      buildSpecialRows([
        ['fly', [150, 'poor']],
        ['burrow', [20]],
        ['spell-resistance', 18],
      ]),
    ).toBe(
      [
        '\\statrow{}{Fly}{150}{poor}',
        '\\statrow{}{Burrow}{20}{}',
        '\\statrow{}{SR}{18}{}',
      ].join('\n'),
    )
  })

  it('spans text across the total and sources columns', () => {
    expect(
      buildSpecialRows([
        ['dr', '10/silver'],
        ['special', ['Blind Fight: no advantage', 'Evasion']],
      ]),
    ).toBe(
      [
        '\\noterow{0.30}{DR}{10/silver}',
        '\\noterow{0.30}{Special}{Blind Fight: no advantage; Evasion}',
      ].join('\n'),
    )
  })

  it('takes the label width of the block it is in', () => {
    expect(
      buildSpecialRows([['special', 'Sneak Attack +5d6']], {
        labelWidth: '0.27',
      }),
    ).toBe('\\noterow{0.27}{Special}{Sneak Attack +5d6}')
  })

  it('sets notes across the whole row, with no label', () => {
    expect(buildSpecialRows([['notes', 'Shield Ward: add shield bonus']])).toBe(
      '\\fullnoterow{Shield Ward: add shield bonus}',
    )
  })

  it('skips hidden keys and has no rows for none', () => {
    expect(buildSpecialRows([['_total', 3]])).toBe('')
    expect(buildSpecialRows([])).toBe('')
  })
})

describe('buildLanguageRows', () => {
  it('sets languages two to a row, then the social note', () => {
    expect(
      buildLanguageRows(['Common', 'Elven', 'Orc'], 'Lycanthropic Empathy'),
    ).toBe(
      [
        '\\langrow{Common}{Elven}',
        '\\langrow{Orc}{}',
        '\\textrow{Social}{Lycanthropic Empathy}',
      ].join('\n'),
    )
  })

  it('marks a sheet with none', () => {
    expect(buildLanguageRows(undefined)).toBe('\\nonerow{2}')
  })
})

describe('buildMoneyRows', () => {
  it('lists the coins a purse holds, then its total and where it is', () => {
    expect(
      buildMoneyRows({
        _total: '734 gp',
        coins: [
          '734 gp',
          '2.08 lbs',
          'pack',
          { pp: 73, gp: 2, sp: 19, cp: 0 },
          '0.02 lbs',
        ],
      }),
    ).toBe(
      [
        '\\moneyrow{Platinum}{73}{}',
        '\\moneyrow{Gold}{2}{}',
        '\\moneyrow{Silver}{19}{}',
        '\\moneyrow{Total}{734 gp}{2.08 lbs, pack}',
      ].join('\n'),
    )
  })

  it('heads each of several purses and totals them all', () => {
    const rows = buildMoneyRows({
      _total: '15 gp',
      purse: ['10 gp', '0.2 lbs', 'belt', { gp: 10 }],
      stash: ['5 gp', '0.1 lbs', 'pack', { gp: 5 }],
    }).split('\n')
    expect(rows[0]).toBe('\\moneygroup{Purse}')
    expect(rows[3]).toBe('\\moneygroup{Stash}')
    expect(rows.at(-1)).toBe('\\moneyrow{All Money}{15 gp}{}')
  })

  it('marks a sheet with no money', () => {
    expect(buildMoneyRows(undefined)).toBe('\\nonerow{3}')
  })
})

describe('buildLevelRows', () => {
  it('lists XP, hit dice, max HP and skill points', () => {
    expect(
      buildLevelRows(
        {
          xp: 91417,
          hd: [13, { d8: 6, d10: 3, d6: 4 }],
          'max-hp': [89, { con: 26, rolls: 63 }],
        },
        { _points: [119, { ranger: 71, fighter: 11, rogue: 37 }] },
      ).split('\n'),
    ).toEqual([
      '\\statrow{glowing-star}{XP}{91417}{}',
      '\\statrow{game-die}{Hit Dice}{13}{6d8, 3d10, 4d6}',
      '\\statrow{heart-with-ribbon}{Max HP}{89}{Con +26, Rolls +63}',
      '\\statrow{graduation-cap}{Skill Points}{119}{Fighter +11, Ranger +71, Rogue +37}',
    ])
  })

  it('adds ECL and level adjustment only when the sheet has them', () => {
    const rows = buildLevelRows(
      { xp: 93830, ecl: 14, hd: [10, 12], 'level-adjustment': 4 },
      {},
    ).split('\n')
    expect(rows).toEqual([
      '\\statrow{glowing-star}{XP}{93830}{}',
      '\\statrow{chart-increasing}{ECL}{14}{}',
      '\\statrow{heavy-plus-sign}{Level Adj.}{+4}{}',
      '\\statrow{game-die}{Hit Dice}{10}{d12}',
      '\\statrow{heart-with-ribbon}{Max HP}{}{}',
    ])
  })
})

describe('buildNoteRows', () => {
  it('gives each note a row', () => {
    expect(buildNoteRows({ devotee: 'Obad-Hai', nonlethal: '0/42' })).toBe(
      ['\\textrow{Devotee}{Obad-Hai}', '\\textrow{Nonlethal}{0/42}'].join('\n'),
    )
  })

  it('marks a sheet with none', () => {
    expect(buildNoteRows(undefined)).toBe('\\nonerow{2}')
  })
})

describe('buildAmmoRows', () => {
  it('lists the ammunition in every container, with where it is', () => {
    expect(
      buildAmmoRows({
        _on: ['equipped', 'pack'],
        money: { _total: '0 gp' },
        equipped: [
          ['+1 Composite Shortbow', 1, 'weapon', '3 lbs', 191],
          ['Arrows', 20, 'ammo', '3 lbs', 194],
        ],
        pack: [['Arrows Cold Iron', 20, 'ammo', '3 lbs', 195]],
      }),
    ).toBe(
      [
        '\\ammorow{Arrows}{20}{Equipped}',
        '\\ammorow{Arrows Cold Iron}{20}{Pack}',
      ].join('\n'),
    )
  })

  it('marks a sheet with none', () => {
    expect(buildAmmoRows({ equipped: [['Dagger', 1, 'weapon']] })).toBe(
      '\\nonerow{4}',
    )
  })
})
