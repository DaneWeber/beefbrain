import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { renderLatex } from './renderLatex'
import {
  buildQuickMovementRows,
  buildQuickOptionsBlock,
  buildQuickSkillRows,
  buildQuickSpellBlocks,
  buildQuickWeaponRows,
} from './quickSheet'
import { summarizeSpellcasting } from './spellSummary'

const ANDY = readFileSync(
  resolve(
    __dirname,
    '../../../data/parties/beefy-boys/andy-black-stag.bnb.yaml',
  ),
  'utf-8',
)

describe('dnd35-quick-reference', () => {
  const { latex } = renderLatex({
    yaml: ANDY,
    templateKey: 'dnd35-quick-reference',
  })

  it('is the detailed sheet’s look, in three columns', () => {
    expect(latex).toContain('\\setmainfont{Atkinson Hyperlegible Next}')
    expect(latex).toContain('\\renewcommand{\\sheettitle}{Quick Reference}')
    expect(latex).toContain('\\begin{multicols*}{3}')
    expect(latex.match(/\\columnbreak/g)).toHaveLength(2)
  })

  it('gives final values without their sources', () => {
    expect(latex).toContain('\\qvalrow{stopwatch}{Initiative}{ +6 }')
    expect(latex).toContain('\\qabilityrow{ox}{STR}{ 20 }{ +5 }')
    expect(latex).toContain('\\qvalrow{shield}{AC}{ 29 }')
    // The preamble defines \\statrow for the detailed sheet; the page has none.
    const body = latex.slice(latex.indexOf('\\begin{document}'))
    expect(body).not.toContain('\\statrow')
  })

  it('prints a level-less spell list as a row, not a table', () => {
    expect(latex).toContain('\\actionrow{Ranger}{Jump (p. 246)}')
    expect(latex).not.toContain('\\begin{qspells}')
  })

  it('leaves no field unfilled', () => {
    expect(latex).not.toContain('[object Object]')
    expect(latex).not.toMatch(/\{\{/)
  })
})

describe('buildQuickWeaponRows', () => {
  const character = {
    combat: {
      attack: {
        melee: { sickle: [20, '1d6+6', 'x2'] },
        ranged: {
          'rapid-shot': [[10, 10, 5], '1d6+1', 'x3', {}, {}, ['60ft']],
          manyshot: [[8, 8], '2x(1d6+1)', 'x2', {}, {}, ['60ft']],
        },
      },
    },
  }

  it('leaves out the usual x2 crit', () => {
    expect(buildQuickWeaponRows(character, 'melee')).toBe(
      '\\qmeleerow{Sickle}{+20}{1d6+6}{}',
    )
  })

  it('shares one cell for crit and range, each kept whole', () => {
    expect(buildQuickWeaponRows(character, 'ranged').split('\n')).toEqual([
      '\\qrangedrow{Rapid Shot}{+10/\\allowbreak +10/\\allowbreak +5}{1d6+1}{\\mbox{x3}, \\mbox{60ft}}',
      '\\qrangedrow{Manyshot}{+8/\\allowbreak +8}{2x\\allowbreak (1d6+1)}{\\mbox{60ft}}',
    ])
  })

  it('marks a table with no weapons', () => {
    expect(buildQuickWeaponRows({}, 'ranged')).toBe('\\nonerow{4}')
  })
})

describe('buildQuickMovementRows', () => {
  it('has a Run row only when the data gives one', () => {
    expect(
      buildQuickMovementRows({
        movement: { speed: [40], fly: [150, 'poor'] },
      }).split('\n'),
    ).toEqual([
      '\\qvalrow{person-walking}{Speed}{40 ft.}',
      '\\qvalrow{}{Fly}{150 ft. (poor)}',
    ])
  })

  it('marks a sheet with no movement at all', () => {
    expect(buildQuickMovementRows({})).toBe('\\nonerow{2}')
  })
})

describe('buildQuickSkillRows', () => {
  it('lists trained skills with their icon and notes', () => {
    expect(
      buildQuickSkillRows({
        skills: {
          appraise: [1, { int: 1 }],
          spot: [15, { wis: 4, ranks: [11] }, 'favored-enemy: +4'],
        },
      }),
    ).toBe('\\qskillrow{eyes}{Spot}{+15}{favored-enemy: +4}')
  })
})

describe('buildQuickOptionsBlock', () => {
  it('leaves the block out when there is nothing in it', () => {
    expect(buildQuickOptionsBlock({})).toBe('')
  })
})

describe('buildQuickSpellBlocks', () => {
  it('lists levels highest first under the caster’s level and ability', () => {
    const character = {
      spells: {
        'caster-class': 'wizard',
        'caster-level': 12,
        'key-ability': 'intelligence',
        'spells-per-day': { '0': 4, '1': 6 },
        'save-dc': { '0': 15, '1': 16 },
        'spells-prepared': { '0': ['Daze', 'Daze'], '1': ['Shield'] },
      },
    }
    expect(
      buildQuickSpellBlocks(summarizeSpellcasting(character)).split('\n'),
    ).toEqual([
      '\\blockrule',
      '\\begin{qspells}{Wizard Prepared}',
      '\\qspellgroup{CL 12th; Int}',
      '\\qspellrow{1st}{6}{16}{Shield}',
      '\\qspellrow{0}{4}{15}{Daze (2)}',
      '\\end{qspells}',
    ])
  })
})
