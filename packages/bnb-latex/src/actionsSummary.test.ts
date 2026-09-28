import { describe, expect, it } from 'vitest'
import {
  buildClassAbilityRows,
  buildFeatRows,
  buildFullAttackBlock,
  buildMeleeRows,
  buildRangedRows,
  buildSpecialAbilityRows,
  buildSpecialAttackRows,
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
    expect(rows).toBe('\\attacknone{5}')
  })

  it('marks an empty table', () => {
    expect(buildRangedRows({})).toBe('\\attacknone{6}')
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
  it('lists extra attack keys and special attacks as Attack rows', () => {
    const rows = buildSpecialAttackRows({
      attack: { bab: [12], 'sneak-attack': '+2d6' },
      'special-attacks': {
        'line-of-force': ['4d8', '60ft line', 'DC 19 Reflex half'],
      },
    })
    expect(rows).toBe(
      [
        '\\statrow{collision}{Sneak Attack}{+2d6}{}',
        '\\statrow{collision}{Line Of Force}{4d8}{60ft line; DC 19 Reflex half}',
      ].join('\n'),
    )
  })
})

describe('buildFeatRows', () => {
  it('reads each shape of feat effect the data uses', () => {
    const rows = buildFeatRows({
      feats: [
        ['Lightning Reflexes', { level: 1 }, ['combat.saves.reflex', 2]],
        [
          'Weapon Focus (Sickle)',
          { fighter: 2 },
          ['combat.attack.melee.sickle', { atk: 1 }],
        ],
        ['Hover', { hd: 1 }, ['move action to hover']],
        ['Acrobatic', { level: 1 }, [{ jump: 2, tumble: 2 }]],
        ['Point Blank Shot', { level: 3 }, '+1 attack within 30ft'],
        [
          'Improved Initiative',
          { human: 1 },
          [['combat.initiative', { improved: 4 }]],
        ],
        ['Purify Magic', { class: 'cleric' }],
        'Awesome Blow',
      ],
    })
    expect(rows.split('\n')).toEqual([
      '\\featrow{Lightning Reflexes}{Reflex +2}{Level 1}',
      '\\featrow{Weapon Focus (Sickle)}{Sickle: Atk +1}{Fighter 2}',
      '\\featrow{Hover}{move action to hover}{Hd 1}',
      '\\featrow{Acrobatic}{Jump +2, Tumble +2}{Level 1}',
      '\\featrow{Point Blank Shot}{+1 attack within 30ft}{Level 3}',
      '\\featrow{Improved Initiative}{Initiative +4}{Human 1}',
      '\\featrow{Purify Magic}{}{Cleric}',
      '\\featrow{Awesome Blow}{}{}',
    ])
  })

  it('drops what goes without saying from the documented effect shape', () => {
    const rows = buildFeatRows({
      feats: [
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
          'Weapon Specialization (Bastard Sword)',
          { level: 6 },
          ['combat.attack.melee.bastard-sword', { dmg: 2 }],
        ],
        [
          'Blind-Fight',
          { level: 1 },
          [
            ['combat.attack.melee._', 'Blind Fight: reroll concealment misses'],
            ['movement.special', 'Blind Fight: 1/2 penalty when unable to see'],
          ],
        ],
      ],
    })
    // The bonus key names the feat and the notes open with it, so neither
    // is repeated; a channel (dmg) is.
    expect(rows.split('\n')).toEqual([
      '\\featrow{Weapon Focus (Longsword)}{Longsword +1}{Fighter 1}',
      '\\featrow{Weapon Specialization (Bastard Sword)}{Bastard Sword: Dmg +2}{Level 6}',
      '\\featrow{Blind-Fight}{reroll concealment misses; 1/2 penalty when unable to see}{Level 1}',
    ])
  })

  it('marks a sheet with no feats', () => {
    expect(buildFeatRows({})).toBe('\\featnone')
  })
})

describe('class and special abilities', () => {
  const classes = new Set(['ranger', 'rogue', 'cleric'])

  it('heads class-keyed lists by class', () => {
    const rows = buildClassAbilityRows(
      {
        'class-abilities': {
          ranger: ['Track', 'Favored Enemy: Humans, Giants'],
          rogue: ['Evasion'],
        },
      },
      classes,
    )
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Ranger}',
      '\\traitrow{Track}{}',
      '\\traitrow{Favored Enemy}{Humans, Giants}',
      '\\traitgroup{Rogue}',
      '\\traitrow{Evasion}{}',
    ])
  })

  it('reads abilities keyed by name, with their detail', () => {
    const rows = buildClassAbilityRows(
      {
        'class-abilities': {
          'turn-undead': '(+3) 4/day, 2d6+10 HD',
          domains: { good: '+1 Caster Level', trickery: 'Bluff' },
          'blessing-of-the-silver-heaven': [
            'Electricity resistance 10',
            'Magic Circle',
          ],
          'celestial-spells': true,
        },
      },
      classes,
    )
    expect(rows.split('\n')).toEqual([
      '\\stackopen',
      '\\traitrow{Turn Undead}{(+3) 4/day, 2d6+10 HD}',
      '\\traitrow{Domains}{Good +1 Caster Level, Trickery Bluff}',
      '\\traitrow{Blessing Of The Silver Heaven}{Electricity resistance 10; Magic Circle}',
      '\\traitrow{Celestial Spells}{}',
    ])
  })

  it('splits a trait at a closing parenthetical, but keeps (Su) with its name', () => {
    const rows = buildSpecialAbilityRows(
      {
        qualities: [
          'Keen Senses (2x normal illumination)',
          'Rock Catching (Ex)',
        ],
      },
      classes,
    )
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Qualities}',
      '\\traitrow{Keen Senses}{2x normal illumination}',
      '\\traitrow{Rock Catching (Ex)}{}',
    ])
  })

  it('groups every other special key, leaving out feats, proficiencies and languages', () => {
    const rows = buildSpecialAbilityRows(
      {
        feats: [['Dodge', { level: 1 }]],
        'class-features': ['Woodland Stride'],
        'ranger-bonus': [['Track', { ranger: 1 }]],
        racial: ['Darkvision 60 ft'],
        'storm-giant': [
          ['Enhanced Swimming', [['skills.swim', '+8 for special actions']]],
        ],
        proficiencies: ['Simple Weapons'],
        languages: ['Common'],
      },
      classes,
    )
    expect(rows.split('\n')).toEqual([
      '\\traitgroup{Ranger Bonus}',
      '\\traitrow{Track}{Ranger 1}',
      '\\traitgroup{Racial}',
      '\\traitrow{Darkvision 60 ft}{}',
      '\\traitgroup{Storm Giant}',
      '\\traitrow{Enhanced Swimming}{Swim: +8 for special actions}',
    ])
  })

  it('marks a sheet with none', () => {
    expect(
      buildClassAbilityRows({ racial: ['Low-light Vision'] }, classes),
    ).toBe('\\traitnone')
  })
})
