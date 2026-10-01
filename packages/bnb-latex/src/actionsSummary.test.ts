import { describe, expect, it } from 'vitest'
import {
  buildAbilitySummaryRows,
  buildAttackOptionRows,
  buildConditionalsBlock,
  buildSpellLikeBlock,
  buildFullAttackBlock,
  buildMeleeRows,
  buildRangedRows,
  buildSpecialAttackRows,
  formatAttackNotes,
} from './actionsSummary'

describe('weapon rows', () => {
  it('lists a melee weapon with the sources it adds to the base bonus', () => {
    const rows = buildMeleeRows({
      melee: {
        _: [17, { bab: 12, str: 5 }],
        'sickle-1-two-weapon': [
          17,
          '1d6+6',
          'x2',
          { _: 17, enhancement: 1, 'weapon-focus': 1, 'two-weapon': -2 },
          { str: 5, enhancement: 1 },
          ['sickle', 'two-weapon'],
        ],
      },
    })
    // The base (_) is the Attack block's to explain, and tags that only
    // repeat the name are dropped.
    expect(rows).toBe(
      '\\meleerow{Sickle 1 Two Weapon}{+17}{1d6+6}{x2}{Enhancement +1, Two Weapon -2, Weapon Focus +1; Dmg Str +5, Enhancement +1}',
    )
  })

  it('keeps tags that say something the name does not', () => {
    const rows = buildMeleeRows({
      melee: {
        'lion-shield': [13, '2d6', 'x2', { bab: 13 }, {}, ['shield', '3/day']],
      },
    })
    expect(rows).toBe('\\meleerow{Lion Shield}{+13}{2d6}{x2}{BAB +13; 3/day}')
  })

  it('moves a ranged weapon’s range tag into its own cell', () => {
    const rows = buildRangedRows({
      ranged: {
        'dagger-throw': [
          18,
          '1d4+5',
          '19-20/x2',
          { _: 18 },
          { str: 5 },
          ['dagger', '10ft/50ft'],
        ],
      },
    })
    expect(rows).toBe(
      '\\rangedrow{Dagger Throw}{+18}{1d4+5}{10ft/50ft}{19-20/x2}{Dmg Str +5}',
    )
  })

  it('lets iteratives and added dice wrap without parting a sign', () => {
    const rows = buildRangedRows({
      ranged: {
        'rapid-shot': [[10, 10, 5], '2d6+12+1d6 cold', 'x3', {}, {}, []],
      },
    })
    expect(rows).toContain(
      '{+10/\\allowbreak +10/\\allowbreak +5}{2d6+12+\\allowbreak 1d6 cold}',
    )
  })

  it('skips the base bonus and a full-attack list', () => {
    const rows = buildMeleeRows({
      melee: {
        _: [16, { bab: 10, str: 6 }],
        'full-attack': [['bite', 13, '1d8+6', 'x2']],
      },
    })
    expect(rows).toBe('\\nonerow{5}')
  })

  it('marks an empty table', () => {
    expect(buildRangedRows({})).toBe('\\nonerow{6}')
  })
})

describe('buildFullAttackBlock', () => {
  it('lists named routines and a full-attack list under melee', () => {
    const block = buildFullAttackBlock({
      'full-attack': {
        'helm-and-two-sickles': {
          main: '+10/+5/+0',
          offhand: '+10/+5/+0',
          helm: 7,
        },
      },
      melee: {
        'full-attack': [
          ['bite', 13, '1d8+6', 'x2'],
          ['claw', 8, '1d6+3', 'x2'],
        ],
      },
    })
    expect(block).toBe(
      [
        '\\blockrule',
        '\\begin{actionblock}{Full Attack}',
        '\\actionrow{Helm And Two Sickles}{Main +10/+5/+0, Offhand +10/+5/+0, Helm +7}',
        '\\actionrow{Melee}{Bite +13 (1d8+6, x2), Claw +8 (1d6+3, x2)}',
        '\\end{actionblock}',
      ].join('\n'),
    )
  })

  it('leaves the block out when there is no routine', () => {
    expect(buildFullAttackBlock({ melee: {} })).toBe('')
  })
})

describe('buildSpecialAttackRows', () => {
  it('lists special attacks as Attack rows, but not extra attack keys', () => {
    const rows = buildSpecialAttackRows({
      attack: { bab: [12], 'sneak-attack': '+2d6' },
      'special-attacks': {
        'line-of-force': ['4d8', '60ft line', 'DC 19 Reflex half'],
      },
    })
    expect(rows).toBe(
      '\\statrow{collision}{Line Of Force}{4d8}{60ft line; DC 19 Reflex half}',
    )
  })
})

describe('formatAttackNotes', () => {
  it('reads extra attack keys as notes, with any detail in parentheses', () => {
    expect(
      formatAttackNotes({
        bab: [12],
        melee: {},
        'full-bab': '+12/+7/+2',
        'sneak-attack': '+2d6',
        smite: ['+4', '1/day', 'vs evil'],
        _hidden: 1,
      }),
    ).toEqual(['Sneak Attack +2d6', 'Smite +4 (1/day, vs evil)'])
  })
})

describe('buildAbilitySummaryRows', () => {
  // A row's entries, with the ties inside each entry read back as spaces.
  const read = (rows: string) => rows.replaceAll('\\listtie ', ' ').split('\n')

  it('condenses each group to names and short details, parted by diamonds', () => {
    const rows = buildAbilitySummaryRows(
      {
        feats: [
          ['Lightning Reflexes', { level: 1 }, ['combat.saves.reflex', 2]],
          ['Point Blank Shot', { level: 3 }, '+1 attack within 30ft'],
          'Awesome Blow',
        ],
        'class-abilities': {
          rogue: ['Sneak Attack +2d6', 'Evasion'],
          ranger: [
            'Track',
            'Favored Enemy: Humans, Giants (+4 bonus to Bluff, Listen, Sense Motive, Spot, Survival, and weapon damage)',
          ],
        },
        racial: ['Darkvision 60 ft', 'Dazzled in Sunlight: -1 attack'],
        proficiencies: ['Simple Weapons', 'All Shields (including tower)'],
        languages: ['Common'],
        senses: ['Darkvision 60 ft'],
      },
      { xp: 91417, hd: [13], ranger: [6], fighter: [3], rogue: [4] },
    )
    // Every class is headed by its level, in level order, even Fighter with
    // no abilities; languages and senses are printed elsewhere.
    expect(read(rows)).toEqual([
      '\\listrow{Racial}{Darkvision 60 ft\\notesep Dazzled in Sunlight (-1 attack)}',
      '\\listrow{Ranger 6}{Track\\notesep Favored Enemy (Humans, Giants)}',
      '\\listrow{Fighter 3}{}',
      '\\listrow{Rogue 4}{Sneak Attack +2d6\\notesep Evasion}',
      '\\listrow{Feats}{Lightning Reflexes\\notesep Point Blank Shot\\notesep Awesome Blow}',
      '\\listrow{Proficiencies}{Simple Weapons\\notesep All Shields (including tower)}',
    ])
  })

  it('ties the words of an entry, so a line breaks between entries', () => {
    expect(
      buildAbilitySummaryRows({ feats: ['Point Blank Shot', 'Dodge'] }, {}),
    ).toBe(
      '\\listrow{Feats}{Point\\listtie Blank\\listtie Shot\\notesep Dodge}',
    )
  })

  it('trims a long detail at a word when it has no parenthetical to drop', () => {
    const rows = buildAbilitySummaryRows(
      {
        racial: [
          'Keen Senses: twice normal illumination, four times in shadowy places',
          'Rock Catching (Ex)',
        ],
      },
      {},
    )
    expect(read(rows)).toEqual([
      '\\listrow{Racial}{Keen Senses (twice normal illumination, four times in…)\\notesep Rock Catching (Ex)}',
    ])
  })

  it('names an entry with effects, and an ability keyed by name with a short detail', () => {
    const rows = buildAbilitySummaryRows(
      {
        'ranger-bonus': [['Rapid Shot', { 'combat-style': 2 }]],
        'storm-giant': [
          ['Enhanced Swimming', [['skills.swim', '+8 for special actions']]],
        ],
        'class-abilities': {
          'turn-undead': '(+3) 4/day, 2d6+10 HD',
          domains: { good: '+1 Caster Level', trickery: 'Bluff' },
          'blessing-of-the-silver-heaven': ['Electricity resistance 10'],
          'celestial-spells': true,
        },
      },
      { cleric: [9] },
    )
    // With one class, abilities not grouped by class are that class's.
    expect(read(rows)).toEqual([
      '\\listrow{Ranger Bonus}{Rapid Shot}',
      '\\listrow{Storm Giant}{Enhanced Swimming}',
      '\\listrow{Cleric 9}{Turn Undead (+3) 4/day, 2d6+10 HD\\notesep Domains (Good, Trickery)\\notesep Blessing Of The Silver Heaven\\notesep Celestial Spells}',
    ])
  })

  it('gives abilities not grouped by class a row of their own when there are several classes', () => {
    const rows = buildAbilitySummaryRows(
      { 'class-features': ['Woodland Stride'] },
      { cleric: [9], 'mystic-theurge': [3] },
    )
    expect(read(rows)).toEqual([
      '\\listrow{Class Abilities}{Woodland Stride}',
      '\\listrow{Cleric 9}{}',
      '\\listrow{Mystic Theurge 3}{}',
    ])
  })

  it('escapes each entry', () => {
    expect(buildAbilitySummaryRows({ racial: ['50% miss chance'] }, {})).toBe(
      '\\listrow{Racial}{50\\%\\listtie miss\\listtie chance}',
    )
  })

  it('marks a sheet with none', () => {
    expect(buildAbilitySummaryRows({ languages: ['Common'] }, {})).toBe(
      '\\nonerow{2}',
    )
  })
})

describe('buildConditionalsBlock', () => {
  it('prints each conditional under its title-cased key', () => {
    const block = buildConditionalsBlock({
      'dazzled-in-sunlight': '-1 attack, Spot, Search',
      'point-blank-shot': '+1 attack and damage within 30ft',
    })
    expect(block.split('\n')).toEqual([
      '\\blockrule',
      '\\begin{actionblock}{Conditionals}',
      '\\actionrow{Dazzled In Sunlight}{-1 attack, Spot, Search}',
      '\\actionrow{Point Blank Shot}{+1 attack and damage within 30ft}',
      '\\end{actionblock}',
    ])
  })

  it('escapes the text', () => {
    expect(buildConditionalsBlock({ blur: '20% miss chance' })).toContain(
      '\\actionrow{Blur}{20\\% miss chance}',
    )
  })

  it('leaves the block out when there are none', () => {
    expect(buildConditionalsBlock(undefined)).toBe('')
    expect(buildConditionalsBlock({})).toBe('')
  })
})

describe('buildSpellLikeBlock', () => {
  it('heads each source with its caster level and save', () => {
    const block = buildSpellLikeBlock({
      'storm-giant': {
        _: { cl: 20, save: 'cha' },
        'call-lightning': ['1/day', { dc: [15, { base: 13, cha: 2 }] }],
        levitate: ['2/day'],
      },
    })
    expect(block.split('\n')).toEqual([
      '\\blockrule',
      '\\fitblock{\\textheight}{%',
      '\\begin{sheetblock}{Spell-Like Abilities}',
      '\\traitgroup{Storm Giant (CL 20, save Cha)}',
      '\\traitrow{Call Lightning}{1/day; DC 15}',
      '\\traitrow{Levitate}{2/day}',
      '\\end{sheetblock}}',
    ])
  })

  it('leaves the block out when there are none', () => {
    expect(buildSpellLikeBlock(undefined)).toBe('')
  })
})

describe('buildAttackOptionRows', () => {
  const classes = new Set(['ranger', 'rogue'])

  it('picks out what bears on an attack, grouped by where it comes from', () => {
    const rows = buildAttackOptionRows(
      {
        feats: [
          ['Lightning Reflexes', { level: 1 }, ['combat.saves.reflex', 2]],
          [
            'Weapon Focus (Sickle)',
            { fighter: 2 },
            ['combat.attack.melee.sickle', { atk: 1 }],
          ],
          ['Point Blank Shot', { level: 3 }, '+1 attack within 30ft'],
          ['Two-Weapon Defense', { level: 9 }, ['combat.defense.ac', 1]],
          ['Greater Two-Weapon Fighting', { level: 12 }],
        ],
        'class-abilities': {
          ranger: ['Track', 'Two-Weapon Fighting (combat style)'],
          rogue: ['Evasion', 'Sneak Attack +2d6'],
        },
        racial: ['Darkvision 60 ft', 'Dazzled in Sunlight: -1 attack'],
        proficiencies: ['Martial Weapons'],
      },
      classes,
      {
        equipped: [
          ['Longsword', 1, 'weapon', '4 lbs', 15, {}, ['combat-offense']],
          [
            'Silver Sheen',
            1,
            'supplies',
            '0.1 lbs',
            221,
            {},
            ['combat-offense'],
          ],
          ['Healing Belt', 1, 'gear', '0.1 lbs', 241, {}, ['combat-defense']],
        ],
      },
    )
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Feats}',
      '\\traitrow{Weapon Focus (Sickle)}{Sickle: Atk +1}',
      '\\traitrow{Point Blank Shot}{+1 attack within 30ft}',
      '\\traitrow{Greater Two-Weapon Fighting}{}',
      '\\traitgroup{Ranger}',
      '\\traitrow{Two-Weapon Fighting}{combat style}',
      '\\traitgroup{Rogue}',
      '\\traitrow{Sneak Attack +2d6}{}',
      '\\traitgroup{Racial}',
      '\\traitrow{Dazzled in Sunlight}{-1 attack}',
      '\\traitgroup{Items}',
      '\\traitrow{Silver Sheen}{}',
    ])
  })

  it('reads each shape of feat effect the data uses', () => {
    const rows = buildAttackOptionRows(
      {
        feats: [
          [
            'Weapon Focus (Sickle)',
            { fighter: 2 },
            ['combat.attack.melee.sickle', { atk: 1 }],
          ],
          ['Improved Grapple', { level: 6 }, ['combat.attack.grapple', 4]],
          ['Power Critical', { fighter: 10 }, [{ 'confirm-crit': 4 }]],
          ['Point Blank Shot', { level: 3 }, '+1 attack within 30ft'],
          [
            'Weapon Focus (Longsword)',
            { fighter: 1 },
            [
              [
                'combat.attack.melee.longsword[0]',
                { 'weapon-focus-longsword': 1 },
              ],
            ],
          ],
          [
            'Blind-Fight',
            { level: 1 },
            [
              [
                'combat.attack.melee._',
                'Blind Fight: reroll concealment misses',
              ],
            ],
          ],
          'Awesome Blow',
        ],
      },
      classes,
      {},
    )
    // A bonus key named for the feat, and a note opening with its name, are
    // not repeated.
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Feats}',
      '\\traitrow{Weapon Focus (Sickle)}{Sickle: Atk +1}',
      '\\traitrow{Improved Grapple}{Grapple +4}',
      '\\traitrow{Power Critical}{Confirm Crit +4}',
      '\\traitrow{Point Blank Shot}{+1 attack within 30ft}',
      '\\traitrow{Weapon Focus (Longsword)}{Longsword +1}',
      '\\traitrow{Blind-Fight}{reroll concealment misses}',
      '\\traitrow{Awesome Blow}{}',
    ])
  })

  it('leaves what the Conditionals print to them', () => {
    const rows = buildAttackOptionRows(
      {
        feats: [
          ['Point Blank Shot', { level: 3 }, '+1 attack within 30ft'],
          ['Power Attack', { level: 1 }],
        ],
        'class-abilities': { rogue: ['Sneak Attack +2d6'] },
        racial: ['Dazzled in Sunlight: -1 attack'],
      },
      classes,
      {
        equipped: [
          ['Silver Sheen', 1, 'supplies', '0.1 lbs', 2, {}, ['combat-offense']],
        ],
      },
      new Set([
        'point-blank-shot',
        'dazzled-in-sunlight',
        'sneak-attack',
        'silver-sheen',
      ]),
    )
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Feats}',
      '\\traitrow{Power Attack}{}',
    ])
  })

  it('marks a sheet with none', () => {
    expect(buildAttackOptionRows({ racial: ['Darkvision'] }, classes, {})).toBe(
      '\\traitnone',
    )
  })
})
