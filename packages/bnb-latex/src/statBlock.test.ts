import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { renderLatex } from './renderLatex'
import {
  buildStatBlockDefense,
  buildStatBlockHeader,
  buildStatBlockOffense,
  buildStatBlockSpecial,
  buildStatBlockStatistics,
} from './statBlock'
import { summarizeSpellcasting } from './spellSummary'

const PARTY = resolve(__dirname, '../../../data/parties')

function readSheet(path: string): string {
  return readFileSync(resolve(PARTY, path), 'utf-8')
}

// The template's lines, one entry each.
function render(path: string): string {
  return renderLatex({
    yaml: readSheet(path),
    templateKey: 'dnd35-stat-block',
  }).latex
}

// A companion with only what a stat block needs, as a player might write
// one for a mule or a hawk.
const MULE = `---
character:
  description:
    name: Grimshank
    race: Mule
    alignment: N
    size: L
  abilities:
    strength: [16, str: 3]
    dexterity: [13, dex: 1]
    constitution: [17, con: 3]
    intelligence: [2, int: -4]
    wisdom: [11, wis: 0]
    charisma: [6, cha: -2]
  levels:
    hd: [3, d8: 3]
    hp: [23, {max-hp: 23, damage: 0}]
  combat:
    initiative: [1, dex: 1]
    saves:
      fortitude: [6, {base: 3, con: 3}]
      reflex: [4, {base: 3, dex: 1}]
      will: [1, {base: 1, wis: 0}]
    attack:
      bab: [2, base: 2]
      melee:
        _: [5, {bab: 2, str: 3}]
        hoof: [4, 1d4+1, x2, {_: 5, secondary: -1}, str: 1, [natural]]
      grapple: [9, {bab: 2, str: 3, size: 4}]
    defense:
      ac: [13, {base: 10, size: -1, dex: 1, natural: 3}]
      touch-ac: [10, {base: 10, size: -1, dex: 1}]
      flat-footed-ac: [12, {base: 10, size: -1, natural: 3}]
  movement:
    speed: [30, base: 30]
  special:
    feats: [Endurance]
    senses: [Low-light vision, Scent]
`

describe('dnd35-stat-block', () => {
  it('prints Black Stag as a stat block, section by section', () => {
    const latex = render('beefy-boys/andy-black-stag.bnb.yaml')
    expect(latex).toContain('\\sbname{ Black Stag }{ Andy O }')
    expect(latex).toContain(
      '\\sbidentity{Male Orc Ranger 6/Fighter 3/Rogue 4}\n\\sbidentity{CG Medium}',
    )
    expect(latex).toContain(
      '\\sbline{\\sbl{Init} +6; \\sbl{Senses} Darkvision 60ft; Listen +12, Spot +15}',
    )
    for (const section of ['Defense', 'Offense', 'Statistics']) {
      expect(latex).toContain(`\\sbsectionif{${section}}{%`)
    }
    expect(latex).not.toContain('[object Object]')
  })

  it('leaves out what a companion has no data for', () => {
    const { latex } = renderLatex({
      yaml: MULE,
      templateKey: 'dnd35-stat-block',
    })
    expect(latex).toContain('\\sbname{ Grimshank }{  }')
    // bnb-core works the attack out again from the levels.
    expect(latex).toMatch(/\\sbline\{\\sbl\{Melee\} Hoof \+\d+ \(1d4\+3\)\}/)
    expect(latex).not.toContain('Languages')
    expect(latex).not.toContain('Possessions')
    // No conditionals: the Special Abilities section is empty, and the
    // template leaves an empty section out.
    expect(latex).toContain('\\sbsectionif{Special Abilities}{%\n%\n}')
  })

  it('is listed among the templates', async () => {
    const { listTemplates } = await import('./templates/registry')
    expect(listTemplates().map((template) => template.key)).toContain(
      'dnd35-stat-block',
    )
  })
})

describe('buildStatBlockHeader', () => {
  it('names the template with the race and leaves out an unknown sex', () => {
    const { identity } = buildStatBlockHeader({
      description: { race: 'Elven', template: 'Were-Rat', size: 'M' },
      levels: { rogue: [10] },
    })
    expect(identity).toBe(
      '\\sbidentity{Elven Were-Rat Rogue 10}\n\\sbidentity{Medium}',
    )
  })
})

describe('buildStatBlockDefense', () => {
  it('puts DR beside hp and a conditional save after the saves', () => {
    const defense = buildStatBlockDefense({
      levels: { hd: [11], hp: [45] },
      combat: {
        defense: {
          ac: [27, { base: 10, dex: 6, armor: 8 }],
          'touch-ac': [16],
          'flat-footed-ac': [21],
          'max-dex': [6],
          dr: '10/silver',
        },
        saves: {
          fortitude: [10],
          reflex: [18],
          will: [12],
          'will-vs-mind-affecting': [17, { will: 12, mindarmor: 5 }],
        },
      },
    })
    expect(defense.split('\n')).toEqual([
      '\\sbline{\\sbl{AC} 27, touch 16, flat-footed 21 (+6 Dex, +8 Armor)}',
      '\\sbline{\\sbl{hp} 45 (11 HD); \\sbl{DR} 10/silver}',
      '\\sbline{\\sbl{Fort} +10, \\sbl{Ref} +18, \\sbl{Will} +12 (+5 Will vs. Mind-Affecting (+17 total))}',
    ])
  })
})

describe('buildStatBlockOffense', () => {
  it('lists weapons as one attack with "or", the usual x2 crit unsaid', () => {
    const offense = buildStatBlockOffense(
      {
        combat: {
          attack: {
            bab: [12],
            melee: {
              _: [17],
              sickle: [20, '1d6+6', 'x2'],
              dagger: [18, '1d4+5', '19-20/x2'],
            },
            ranged: {
              _: [18],
              longbow: [19, '1d8+6', 'x3', {}, {}, ['110ft']],
            },
            grapple: [21],
          },
        },
        movement: { speed: [30], fly: [150, 'poor'] },
      },
      [],
    )
    expect(offense.split('\n')).toEqual([
      '\\sbline{\\sbl{Speed} 30 ft. (6 squares), fly 150 ft. (poor)}',
      '\\sbline{\\sbl{Melee} Sickle +20 (1d6+6) or Dagger +18 (1d4+5/19-20)}',
      '\\sbline{\\sbl{Ranged} Longbow +19 (1d8+6/x3, 110ft)}',
      '\\sbline{\\sbl{Base Atk} +12; \\sbl{Grp} +21}',
    ])
  })

  it('lists spells highest level first, a repeated spell counted', () => {
    const character = {
      spells: {
        'caster-class': 'wizard',
        'caster-level': 12,
        'key-ability': 'intelligence',
        'spells-per-day': { '0': 4, '1': 6 },
        'save-dc': { '0': 15, '1': 16 },
        'spells-prepared': {
          '0': ['Daze', 'Detect Magic', 'Detect Magic'],
          '1': ['Shield'],
        },
      },
    }
    const offense = buildStatBlockOffense(
      character,
      summarizeSpellcasting(character),
    )
    expect(offense.split('\n')).toEqual([
      '\\sbline{\\sbl{Wizard Spells Prepared} (CL 12th; Int):}',
      '\\sbspell{1st (6/day, DC 16)}{Shield}',
      '\\sbspell{0 (4/day, DC 15)}{Daze, Detect Magic (2)}',
    ])
  })

  it('groups spell-like abilities by uses, with a calculated caster level', () => {
    const offense = buildStatBlockOffense(
      {
        'spell-like-abilities': {
          ranger: {
            _: { cl: [6, { ranger: 6 }] },
            'speak-with-animals': ['3/day'],
            'call-lightning': ['3/day', { dc: [15, { base: 13, cha: 2 }] }],
            levitate: ['1/day'],
          },
        },
      },
      [],
    )
    expect(offense.split('\n')).toEqual([
      '\\sbline{\\sbl{Spell-Like Abilities} (Ranger; CL 6):}',
      '\\sbspell{3/day}{speak with animals, call lightning (DC 15)}',
      '\\sbspell{1/day}{levitate}',
    ])
  })

  it('puts charged and single-use items under Combat Gear', () => {
    const offense = buildStatBlockOffense(
      {
        inventory: {
          _on: ['equipped'],
          equipped: [
            ['Wand Cure Light (45 charges)', 1, 'wand', '0 lbs', 1],
            ['Potion Fly', 5, 'potion', '0 lbs', 2],
            ['Scroll Case', 1, 'container', '0.5 lbs', 3],
            ['Rope', 1, 'gear', '5 lbs', 4],
          ],
          horse: [['Potion Blur', 1, 'potion', '0 lbs', 5]],
        },
      },
      [],
    )
    expect(offense).toBe(
      '\\sbline{\\sbl{Combat Gear} Wand Cure Light (45 charges), Potion Fly (5)}',
    )
  })
})

describe('buildStatBlockStatistics', () => {
  it('lists trained skills, with their notes, and leaves the rest out', () => {
    const statistics = buildStatBlockStatistics({
      skills: {
        _acp: [0],
        appraise: [1, { int: 1 }],
        climb: [13, { str: 5, ranks: [8, { ranger: 8 }], acp: 0 }],
        heal: [6, { wis: 4, 'healers-kit': 2 }],
        profession: [Number.NaN, { wis: 4, 'not-trained': Number.NaN }],
        spot: [15, { wis: 4, ranks: [11] }, 'favored-enemy: +4'],
      },
    })
    expect(statistics).toBe(
      '\\sbline{\\sbl{Skills} Climb +13, Heal +6, Spot +15 (favored-enemy: +4)}',
    )
  })

  it('names in SQ only what Offense does not', () => {
    const statistics = buildStatBlockStatistics({
      levels: { rogue: [4] },
      special: {
        'class-abilities': {
          rogue: ['Trap-finding', 'Sneak Attack +2d6', 'Evasion'],
        },
      },
      combat: { attack: { 'sneak-attack': '+2d6' } },
    })
    expect(statistics).toBe('\\sbline{\\sbl{SQ} Trap-finding, Evasion}')
  })

  it('carries what is on the character, combat gear first', () => {
    const statistics = buildStatBlockStatistics({
      inventory: {
        _on: ['equipped'],
        money: { _total: '230 gp' },
        equipped: [
          ['Wand Cure Light (45 charges)', 1, 'wand', '0 lbs', 1],
          ['Arrows', 31, 'ammo', '0.15 lbs', 2],
          [{ USED: 'Diamond dust' }, 2, 'supplies', '0.1 lbs', 3, {}, ['used']],
        ],
        horse: [['Saddle', 1, 'gear', '4 lbs', 4]],
      },
    })
    expect(statistics).toBe(
      '\\sbline{\\sbl{Possessions} combat gear plus Arrows (31), 230 gp}',
    )
  })
})

describe('buildStatBlockSpecial', () => {
  it('prints each conditional as a special ability', () => {
    expect(
      buildStatBlockSpecial({
        conditionals: { 'trap-sense': '+1 Reflex and dodge AC vs. traps' },
      }),
    ).toBe('\\sbability{Trap Sense}{+1 Reflex and dodge AC vs. traps}')
  })
})
