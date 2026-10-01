import { describe, expect, it } from 'vitest'
import {
  buildAmmoRows,
  buildAwarenessRows,
  buildBlockNotes,
  buildLevelRows,
  buildMoneyRows,
  buildNoteRows,
  buildSpecialRows,
  separateConditionalSaves,
  splitNotes,
} from './sheetExtras'

describe('buildSpecialRows', () => {
  it('shows a total with its sources and notes', () => {
    expect(
      buildSpecialRows([['vs-poison', [4, { periapt: 4 }, 'while worn']]], {
        signed: true,
      }),
    ).toBe('\\statrow{}{Vs Poison}{+4}{Periapt +4; while worn}')
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

  it('skips hidden keys and has no rows for none', () => {
    expect(buildSpecialRows([['_total', 3]])).toBe('')
    expect(buildSpecialRows([])).toBe('')
  })
})

describe('separateConditionalSaves', () => {
  it('reads a save built on a base save as a bonus to it', () => {
    expect(
      separateConditionalSaves([
        ['will-vs-mind-affecting', [15, { will: 10, mindarmor: 5 }, '3/day']],
        ['reflex-vs-traps', [9, { reflex: 7, 'trap-sense': 2 }]],
      ]),
    ).toEqual({
      rows: [],
      notes: [
        '3/day +5 Will vs. Mind-Affecting (+15 total)',
        '+2 Reflex Vs Traps (+9 total)',
      ],
    })
  })

  it('keeps a save with no base save among its sources as a row', () => {
    const poison: [string, unknown] = ['vs-poison', [4, { periapt: 4 }]]
    const text: [string, unknown] = ['special', 'Evasion']
    expect(separateConditionalSaves([poison, text])).toEqual({
      rows: [poison, text],
      notes: [],
    })
  })
})

describe('buildAwarenessRows', () => {
  it('sets all the languages on one row and all the senses on another', () => {
    expect(
      buildAwarenessRows(
        ['Common', 'Elven', 'Orc'],
        ['Scent (30ft, 60ft downwind)', 'Low-light Vision'],
      ),
    ).toBe(
      [
        '\\awarerow{speaking-head}{Languages}{Common, Elven, Orc}',
        '\\awarerow{eye}{Senses}{Scent (30ft, 60ft downwind), Low-light Vision}',
      ].join('\n'),
    )
  })

  it('escapes the names', () => {
    expect(buildAwarenessRows(['Thieves_ Cant'], 'Darkvision 60ft')).toBe(
      [
        '\\awarerow{speaking-head}{Languages}{Thieves\\_ Cant}',
        '\\awarerow{eye}{Senses}{Darkvision 60ft}',
      ].join('\n'),
    )
  })

  it('keeps both rows, empty, for a sheet with neither', () => {
    expect(buildAwarenessRows(undefined, [])).toBe(
      [
        '\\awarerow{speaking-head}{Languages}{}',
        '\\awarerow{eye}{Senses}{}',
      ].join('\n'),
    )
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
  it('lists XP, ECL from the class levels, hit dice, max HP and skill points', () => {
    expect(
      buildLevelRows(
        {
          xp: 91417,
          ranger: [6],
          fighter: [3],
          rogue: [4],
          hd: [13, { d8: 6, d10: 3, d6: 4 }],
          'max-hp': [89, { con: 26, rolls: 63 }],
        },
        { _points: [119, { ranger: 71, fighter: 11, rogue: 37 }] },
      ).split('\n'),
    ).toEqual([
      '\\statrow{glowing-star}{XP}{91417}{}',
      '\\statrow{chart-increasing}{ECL}{13}{}',
      '\\statrow{game-die}{Hit Dice}{13}{6d8, 3d10, 4d6}',
      '\\statrow{heart-with-ribbon}{Max HP}{89}{Con +26, Rolls +63}',
      '\\statrow{graduation-cap}{Skill Points}{119}{Fighter +11, Ranger +71, Rogue +37}',
    ])
  })

  it("takes the sheet's ECL, and adds level adjustment only when it has one", () => {
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
  it('lists the ammunition in every container, under the container', () => {
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
        '\\ammogroup{Equipped}',
        '\\ammorow{Arrows}{20}',
        '\\ammogroup{Pack}',
        '\\ammorow{Arrows Cold Iron}{20}',
      ].join('\n'),
    )
  })

  it('marks a sheet with none', () => {
    expect(buildAmmoRows({ equipped: [['Dagger', 1, 'weapon']] })).toBe(
      '\\nonerow{3}',
    )
  })
})

describe('block notes', () => {
  it('splits text at semicolons outside parentheses', () => {
    expect(
      splitNotes('Vanisher Cloak (3 charges/day; 1=4rds); Deathward 1/day'),
    ).toEqual(['Vanisher Cloak (3 charges/day; 1=4rds)', 'Deathward 1/day'])
  })

  it('takes a list as one note per entry', () => {
    expect(splitNotes(['Evasion', 'DR 10/silver; Improved Evasion'])).toEqual([
      'Evasion',
      'DR 10/silver',
      'Improved Evasion',
    ])
  })

  it('sets the notes under the table, parted by \\notesep', () => {
    expect(buildBlockNotes('Deathward 1/day; 50% chance', ['Evasion'])).toBe(
      '\\blocknotes{Deathward 1/day\\notesep 50\\% chance\\notesep Evasion}',
    )
  })

  it('prints nothing for a block without notes', () => {
    expect(buildBlockNotes(undefined, [])).toBe('')
  })
})
