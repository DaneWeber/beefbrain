import { escapeLatexText } from './renderTemplate'
import { getSkillIcon } from './skillIcons'
import { formatTitleKey } from './text'
import {
  formatSigned,
  formatSignedTotal,
  getArrayFirst,
  toRecord,
} from './components'
import {
  breakableCell,
  formatDetail,
  formatFullAttackEntry,
  getWeapons,
  macro,
} from './actionsSummary'
import { separateConditionalSaves } from './sheetExtras'
import {
  countSpells,
  formatCrit,
  formatExtra,
  formatItem,
  formatSpeed,
  getAttackOptionNames,
  getCarriedItems,
  getNotableSkills,
  getSpecialAttacks,
  groupSpellLike,
  isCombatGear,
  ordinal,
} from './statBlock'
import type { CasterSummary } from './spellSummary'

// The Quick Reference sheet: one landscape page in the detailed sheet's
// blocks and tables, three columns, final values only. What it shows is
// what the stat block shows (statBlock.ts picks it); this file lays it out
// as rows for the template's macros, every cell escaped, for {{{...}}}
// tokens.

// Defense keys the fixed rows print, or that are only for working AC out.
const AC_KEYS = new Set(['ac', 'touch-ac', 'flat-footed-ac', 'acp', 'max-dex'])

const DEFENSE_LABELS: Record<string, string> = {
  dr: 'DR',
  'spell-resistance': 'SR',
  sr: 'SR',
}

/**
 * Defense's optional rows after HP and AC: DR, SR and any other key of
 * `combat.defense`, as `\qvalrow{}{label}{value}`.
 */
export function buildQuickDefenseRows(
  character: Record<string, unknown>,
): string {
  const defense = toRecord(toRecord(character.combat).defense)
  return Object.entries(defense)
    .filter(([key]) => !key.startsWith('_') && !AC_KEYS.has(key))
    .map(([key, value]) =>
      macro('qvalrow', [
        '',
        DEFENSE_LABELS[key] ?? formatTitleKey(key),
        formatExtra(value),
      ]),
    )
    .join('\n')
}

/**
 * Saves beyond the three, as rows; a save built on one of the three (Will
 * vs. mind-affecting) is a note under the table instead.
 */
export function buildQuickSaves(character: Record<string, unknown>): {
  rows: string
  notes: string[]
} {
  const saves = toRecord(toRecord(character.combat).saves)
  const others = separateConditionalSaves(
    Object.entries(saves).filter(
      ([key]) => !['fortitude', 'reflex', 'will'].includes(key),
    ),
  )
  return {
    rows: others.rows
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) =>
        macro('qvalrow', ['', formatTitleKey(key), formatSignedTotal(value)]),
      )
      .join('\n'),
    notes: others.notes,
  }
}

// Movement keys that are not a mode of movement.
const NOT_SPEED_KEYS = new Set(['speed', 'run', 'load', 'capacity'])

/**
 * The Movement rows: Speed and Run when the data has them, then every other
 * mode of movement (fly, swim, burrow). `\nonerow` when there are none.
 */
export function buildQuickMovementRows(
  character: Record<string, unknown>,
): string {
  const movement = toRecord(character.movement)
  const run = getArrayFirst(movement.run)
  const rows = [
    movement.speed === undefined
      ? ''
      : macro('qvalrow', [
          'person-walking',
          'Speed',
          formatSpeed(movement.speed),
        ]),
    run === ''
      ? ''
      : macro('qvalrow', ['person-running', 'Run', `${String(run)} ft.`]),
    ...Object.entries(movement)
      .filter(([key]) => !key.startsWith('_') && !NOT_SPEED_KEYS.has(key))
      .map(([key, value]) =>
        macro('qvalrow', ['', formatTitleKey(key), formatSpeed(value)]),
      ),
  ].filter((row) => row)
  return rows.length > 0 ? rows.join('\n') : '\\nonerow{2}'
}

// A weapon's attack and damage, breakable at their slashes and added dice,
// and its crit when that is not the usual x2, kept whole.
function weaponCells(attack: string, damage: string, crit: string): string[] {
  const shownCrit = formatCrit(crit)
  return [
    breakableCell(attack),
    // "2x(1d6+1)", Manyshot's two arrows, may break after the "2x" too.
    breakableCell(damage).replace(/\d+x(?=\()/g, '$&\\allowbreak '),
    shownCrit ? `\\mbox{${escapeLatexText(shownCrit)}}` : '',
  ]
}

/**
 * `\qmeleerow{name}{atk}{damage}{crit}` per melee weapon and
 * `\qrangedrow{name}{atk}{damage}{crit, range}` per ranged one; the crit
 * is left out for an x2, and each part of the last cell is kept whole, so
 * the cell breaks only between them. `\nonerow` when there are none.
 */
export function buildQuickWeaponRows(
  character: Record<string, unknown>,
  group: 'melee' | 'ranged',
): string {
  const attack = toRecord(toRecord(character.combat).attack)
  const weapons = getWeapons(attack[group])
  if (weapons.length === 0) {
    return '\\nonerow{4}'
  }
  return weapons
    .map((weapon) => {
      const [atk, damage, crit] = weaponCells(
        weapon.attack,
        weapon.damage,
        weapon.crit,
      )
      const last =
        group === 'melee'
          ? crit
          : [
              crit,
              weapon.range ? `\\mbox{${escapeLatexText(weapon.range)}}` : '',
            ]
              .filter((part) => part)
              .join(', ')
      const name = group === 'melee' ? 'qmeleerow' : 'qrangedrow'
      return `\\${name}{${escapeLatexText(weapon.name)}}{${atk}}{${damage}}{${last}}`
    })
    .join('\n')
}

/**
 * The Full Attack block (`\actionrow`s in an `actionblock`, after a
 * `\blockrule`), or nothing for a character without routines.
 */
export function buildQuickFullAttackBlock(
  character: Record<string, unknown>,
): string {
  const attack = toRecord(toRecord(character.combat).attack)
  const rows: [string, string][] = Object.entries(
    toRecord(attack['full-attack']),
  ).map(([name, routine]) => [formatTitleKey(name), formatDetail(routine)])
  for (const [group, label] of [
    ['melee', 'Melee'],
    ['ranged', 'Ranged'],
  ] as const) {
    const routine = toRecord(attack[group])['full-attack']
    if (Array.isArray(routine)) {
      rows.push([label, routine.map(formatFullAttackEntry).join(', ')])
    } else if (routine !== undefined) {
      rows.push([label, formatDetail(routine)])
    }
  }
  if (rows.length === 0) {
    return ''
  }
  return [
    '\\blockrule',
    '\\begin{actionblock}{Full Attack}',
    ...rows.map((row) => macro('actionrow', row)),
    '\\end{actionblock}',
  ].join('\n')
}

// Entries for a `\listrow`, parted by `\notesep`, each kept whole where
// it can be, as the Build page's are.
function listEntries(entries: string[]): string {
  return entries
    .filter((entry) => entry)
    .map((entry) => escapeLatexText(entry).replace(/ /g, '\\listtie '))
    .join('\\notesep ')
}

/**
 * The Options block: `\listrow`s for the special attacks, the attack
 * options and the combat gear, after a `\blockrule`; nothing when the
 * character has none of them.
 */
export function buildQuickOptionsBlock(
  character: Record<string, unknown>,
): string {
  const groups: [string, string[]][] = [
    ['Special', getSpecialAttacks(character).map(([, text]) => text)],
    ['Attack', getAttackOptionNames(character)],
    [
      'Gear',
      getCarriedItems(toRecord(character.inventory))
        .filter(isCombatGear)
        .map(formatItem),
    ],
  ]
  const rows = groups
    .filter(([, entries]) => entries.length > 0)
    .map(
      ([label, entries]) =>
        `\\listrow{${escapeLatexText(label)}}{${listEntries(entries)}}`,
    )
  if (rows.length === 0) {
    return ''
  }
  return [
    '\\blockrule',
    '\\begin{sheetblock}{Options}',
    '\\begin{tabular}{L{0.20\\linewidth}L{0.73\\linewidth}}',
    ...rows,
    '\\end{tabular}',
    '\\end{sheetblock}',
  ].join('\n')
}

/**
 * The Conditionals block: each of `character.conditionals`, its name beside
 * what it does and when, after a `\blockrule`; nothing for a sheet without.
 */
export function buildQuickConditionalsBlock(
  character: Record<string, unknown>,
): string {
  const rows = Object.entries(toRecord(character.conditionals))
    .filter(([key]) => !key.startsWith('_'))
    .map(([key, value]) =>
      macro('actionrow', [formatTitleKey(key), formatDetail(value)]),
    )
  if (rows.length === 0) {
    return ''
  }
  return [
    '\\blockrule',
    '\\begin{actionblock}{Conditionals}',
    ...rows,
    '\\end{actionblock}',
  ].join('\n')
}

/**
 * One `\qskillrow{icon}{name}{bonus}{notes}` per skill with ranks or a bonus
 * beyond its ability's: the rest are their ability's modifier, which the
 * Abilities block gives.
 */
export function buildQuickSkillRows(
  character: Record<string, unknown>,
): string {
  const skills = getNotableSkills(toRecord(character.skills))
  if (skills.length === 0) {
    return '\\nonerow{3}'
  }
  return skills
    .map(({ key, total, notes }) => {
      // The icon is a CLDR emoji name from our own table, never user text.
      const icon = getSkillIcon(key)
      const cells = [formatTitleKey(key), formatSigned(total), notes.join('; ')]
      return `\\qskillrow{${icon}}{${cells.map(escapeLatexText).join('}{')}}`
    })
    .join('\n')
}

/**
 * The Spell-Like Abilities block, after a `\blockrule`: a `\qgrouprow` per
 * source with its caster level, then an `\actionrow` per number of uses
 * with the abilities. Nothing for a sheet without any.
 */
export function buildQuickSpellLikeBlock(
  character: Record<string, unknown>,
): string {
  const sources = groupSpellLike(character['spell-like-abilities'])
  if (sources.length === 0) {
    return ''
  }
  return [
    '\\blockrule',
    '\\begin{actionblock}{Spell-Like}',
    ...sources.flatMap(({ settings, byUses }) => [
      macro('qgrouprow', [settings]),
      ...byUses.map(([uses, entries]) =>
        macro('actionrow', [uses, entries.join(', ')]),
      ),
    ]),
    '\\end{actionblock}',
  ].join('\n')
}

// A caster whose spells the data gives no level or uses for (Andy's
// `ranger: [Jump]`): a list, with nothing to put in a table.
function isPlainList(caster: CasterSummary): boolean {
  return caster.levels.every((level) => level.level === '' && !level.perDay)
}

/**
 * A block per caster, after a `\blockrule`: its caster level, key ability
 * and domains across the top, then a `\qspellrow{level}{per day}{DC}
 * {spells}` per spell level, highest first, a repeated spell counted
 * ("Detect Magic (2)"). Casters with only a plain list share a Spells block,
 * a row each. Nothing for a sheet with no spellcasting.
 */
export function buildQuickSpellBlocks(casters: CasterSummary[]): string {
  const withSpells = casters.filter((caster) => caster.levels.length > 0)
  const lists = withSpells.filter(isPlainList)
  const listBlock =
    lists.length === 0
      ? []
      : [
          [
            '\\blockrule',
            '\\begin{actionblock}{Spells}',
            ...lists.map((caster) =>
              macro('actionrow', [
                caster.name,
                countSpells(caster.levels.flatMap((level) => level.spells)),
              ]),
            ),
            '\\end{actionblock}',
          ].join('\n'),
        ]
  const tables = withSpells
    .filter((caster) => !isPlainList(caster))
    .map((caster) => {
      const settings = [
        caster.casterLevel ? `CL ${ordinal(caster.casterLevel)}` : '',
        caster.ability,
        caster.domains ? `Domains ${caster.domains}` : '',
      ]
        .filter((part) => part)
        .join('; ')
      const rows = [...caster.levels]
        .sort((a, b) => Number(b.level) - Number(a.level))
        .map((level) =>
          macro('qspellrow', [
            level.level === '' ? '' : ordinal(level.level),
            level.perDay,
            level.saveDc,
            countSpells(level.spells),
          ]),
        )
      return [
        '\\blockrule',
        `\\begin{qspells}{${escapeLatexText(`${caster.name} ${caster.listLabel}`)}}`,
        ...(settings ? [macro('qspellgroup', [settings])] : []),
        ...rows,
        '\\end{qspells}',
      ].join('\n')
    })
  return [...listBlock, ...tables].join('\n')
}
