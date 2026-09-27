import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from 'vitest'
import { renderLatex } from './renderLatex'
import { LatexGenerationError } from './errors'

const VALID_YAML = readFileSync(
  resolve(__dirname, '../../bnb-core/src/examples/final/dnd35-fighter-1.yaml'),
  'utf-8',
)

describe('renderLatex', () => {
  it('renders default dnd35 template with calculated data', () => {
    const result = renderLatex({ yaml: VALID_YAML })
    expect(result.template.key).toBe('dnd35-detailed')
    expect(result.latex).toContain('\\setmainfont{Atkinson Hyperlegible Next}')
    expect(result.latex).toContain('Landorf the Human Fighter')
    expect(result.latex).toContain('fighter 1')
    expect(result.latex).toContain('Inventory Sheet (Detailed Draft)')
    expect(result.latex).toContain('Spell Sheet (Detailed Draft)')
  })

  it('supports secure value escaping in field substitution', () => {
    const editedYaml = VALID_YAML.replace(
      'Landorf the Human Fighter',
      'Landorf & Friends',
    )
    const result = renderLatex({ yaml: editedYaml })
    expect(result.latex).toContain('Landorf \\& Friends')
  })

  it('rejects oversized yaml payloads', () => {
    expect(() => renderLatex({ yaml: VALID_YAML, maxYamlBytes: 8 })).toThrow(
      LatexGenerationError,
    )
  })

  it('renders expanded detailed sheet sections', () => {
    const result = renderLatex({
      yaml: VALID_YAML,
      templateKey: 'dnd35-detailed',
    })

    expect(result.latex).toContain('Character Description')
    expect(result.latex).toContain('Abilities')
    expect(result.latex).toContain('Combat Snapshot')
    expect(result.latex).toContain('Saves')
    expect(result.latex).toContain('Skills')
    expect(result.latex).toContain('Magic Item Slots')
    expect(result.latex).toContain('longsword')
    expect(result.latex).toContain('Appraise')
  })

  describe('skills.detailedTable', () => {
    const renderSkillsTable = (yaml: string) =>
      renderLatex({ yaml, templateContent: '{{{skills.detailedTable}}}' }).latex

    it('lists skills alphabetically', () => {
      const latex = renderSkillsTable(VALID_YAML)
      expect(latex.indexOf('Appraise')).toBeLessThan(latex.indexOf('Balance'))
      expect(latex.indexOf('Balance')).toBeLessThan(latex.indexOf('Climb'))
      expect(latex.indexOf('Jump')).toBeLessThan(latex.indexOf('Listen'))
    })

    it('splits a double-ACP skill into final and pre-ACP bonus', () => {
      const latex = renderSkillsTable(VALID_YAML)
      // swim: [-6, {str: 2, acp: -8}] -> final -6, pre-ACP -6 - (-8) = +2
      expect(latex).toContain(
        '\\skillrow{person-swimming}{Swim}{-6}{+2}{Str +2}',
      )
    })

    it('omits acp and zero-valued components from the source list', () => {
      const latex = renderSkillsTable(VALID_YAML)
      // appraise: [2, {int: 0, ranks: 2}] -> Int is zero, so only Ranks shows
      expect(latex).toContain(
        '\\skillrow{gem-stone}{Appraise}{+2}{+2}{Ranks +2}',
      )
    })

    it('lists ranks without the class breakdown behind them', () => {
      // The table shows one level of sources: "Ranks +15", not the wizard
      // levels that bought those ranks.
      const yaml = `---
character:
  abilities:
    intelligence: [20, int: 5]
  skills:
    spellcraft: [22, {int: 5, ranks: [15, wizard: 15], knowledge-arcana-synergy: 2}]
`
      const latex = renderSkillsTable(yaml)
      expect(latex).toContain(
        '\\skillrow{sparkles}{Spellcraft}{+22}{+22}{Int +5, Ranks +15, Knowledge Arcana Synergy +2}',
      )
      expect(latex).not.toContain('Wizard')
    })

    it('renders a .nan total and component as an em-dash', () => {
      // A trained-only skill with no ranks: the character cannot attempt the
      // roll at all, which is not the same as a +0 bonus.
      const yaml = `---
character:
  abilities:
    charisma: [6, cha: -2]
  skills:
    handle-animal: [.nan, {cha: -2, no-training: .nan}]
`
      const latex = renderSkillsTable(yaml)
      expect(latex).toContain(
        '\\skillrow{paw-prints}{Handle Animal}{\u2014}{\u2014}{Cha -2, No Training \u2014}',
      )
      expect(latex).not.toContain('NaN')
    })

    it('still shows a real zero bonus as +0', () => {
      const yaml = `---
character:
  abilities:
    strength: [10, str: 0]
  skills:
    climb: [0, str: 0]
`
      expect(renderSkillsTable(yaml)).toContain(
        '\\skillrow{person-climbing}{Climb}{+0}{+0}{}',
      )
    })

    it('shows a non-zero item-effect bonus as a named source', () => {
      const yaml = `---
character:
  abilities:
    charisma: [12, cha: 1]
  skills:
    use-magic-device: [14, {cha: 1, ranks: 13}]
  inventory:
    equipped:
      - [ring of use magic device, 1, wondrous, 0 lbs, 5000 gp, {}, [], [[skills.use-magic-device, {magic-ring: 5}]]]
`
      const latex = renderSkillsTable(yaml)
      expect(latex).toContain(
        '\\skillrow{magic-wand}{Use Magic Device}{+19}{+19}{Cha +1, Ranks +13, Magic Ring +5}',
      )
    })
  })
  describe('page 1 sources', () => {
    const renderField = (yaml: string, field: string) =>
      renderLatex({ yaml, templateContent: `{{${field}}}` }).latex

    const yaml = `---
character:
  abilities:
    strength: [20, str: 5, {base: 12, orc: 4, belt-enhancement: 4}]
    dexterity: [16, dex: 3]
  levels:
    hp: [11, {max-hp: 11, damage: 0}]
  combat:
    defense:
      ac: [18, {base: 10, armor: 5, dex: 3}]
    saves:
      will: [0, {}]
`

    it('lists what an ability score is built from, base unsigned', () => {
      expect(renderField(yaml, 'abilities.strength.sources')).toBe(
        'Base 12, Orc +4, Belt Enhancement +4',
      )
    })

    it('shows no sources for a bare ability score', () => {
      expect(renderField(yaml, 'abilities.dexterity.sources')).toBe('')
    })

    it('signs ability modifiers', () => {
      expect(renderField(yaml, 'abilities.strength.mod')).toBe('+5')
    })

    it('drops zero components from a breakdown', () => {
      expect(renderField(yaml, 'combat.hp.sources')).toBe('Max HP +11')
      expect(renderField(yaml, 'combat.ac.sources')).toBe(
        'Dex +3, Base 10, Armor +5',
      )
    })

    it('shows nothing, not "none", for an empty breakdown', () => {
      expect(renderField(yaml, 'saves.will.sources')).toBe('')
    })
  })

  describe('inventory tables', () => {
    const renderField = (yaml: string, field: string) =>
      renderLatex({ yaml, templateContent: `{{{${field}}}}` }).latex

    const yaml = `---
character:
  inventory:
    _on: [equipped, pack]
    money:
      coins: [10 gp, 0.2 lbs, pack]
    equipped:
      - [Cloak of Resistance +3, 1, gear, 1 lb, 1, saves-resistance: 3, [magic, shoulder-slot]]
      - [Pearl of Speech, 3, gear, 0 lbs, 2, [magic, face-slot]]
      - [Third Eye, 1, gear, 0 lbs, 3, [magic, face-slot]]
      - [Heward's Haversack, 1, container, 5 lbs, 4, [magic, other-slot]]
      - [Arrows, 20, weapon, 0.15 lbs, 5]
    pack:
      - [Healing Belt, 1, gear, 1 lb, 6, [magic, belt-slot]]
      - [Bedroll, 1, gear, 5 lbs, 7]
    horse:
      - [Saddle & Bit, 1, gear, 25 lbs, 8]
`

    it('lists each container with its subtotal, then its items', () => {
      expect(renderField(yaml, 'inventory.detailedTable')).toBe(
        [
          '\\invcontainer{Equipped}{9}',
          '\\invitem{Cloak of Resistance +3}{1}{1}',
          '\\invitem{Pearl of Speech}{3}{0}',
          '\\invitem{Third Eye}{1}{0}',
          "\\invitem{Heward's Haversack}{1}{5}",
          '\\invitem{Arrows}{20}{3}',
          '\\invcontainer{Pack}{6}',
          '\\invitem{Healing Belt}{1}{1}',
          '\\invitem{Bedroll}{1}{5}',
          '\\invcontainer{Horse (not carried)}{25}',
          '\\invitem{Saddle \\& Bit}{1}{25}',
        ].join('\n'),
      )
    })

    it('fills slots head to toe from equipped items only', () => {
      const latex = renderField(yaml, 'inventory.slotsTable')
      const rows = latex.split('\n')
      expect(rows.slice(0, 12).map((row) => row.split('}')[0])).toEqual(
        [
          'Head',
          'Face',
          'Throat',
          'Shoulders',
          'Body',
          'Torso',
          'Arms',
          'Hands',
          'Left Ring',
          'Right Ring',
          'Waist',
          'Feet',
        ].map((slot) => `\\slotrow{${slot}`),
      )
      expect(latex).toContain(
        '\\slotrow{Shoulders}{0}{\\slotitem{Cloak of Resistance +3}{Saves Resistance=3}}',
      )
      // The belt in the pack is a spare, not worn.
      expect(latex).toContain('\\slotrow{Waist}{0}{}')
    })

    it('flags a slot claimed by more than one item', () => {
      expect(renderField(yaml, 'inventory.slotsTable')).toContain(
        '\\slotrow{Face}{1}{\\slotitem{Pearl of Speech}{}\\newline \\slotitem{Third Eye}{}}',
      )
    })

    it('lists equipped slotless items after the body slots', () => {
      const rows = renderField(yaml, 'inventory.slotsTable').split('\n')
      expect(rows.slice(12)).toEqual([
        "\\slotlessrow{Slotless}{\\slotitem{Heward's Haversack}{}}",
      ])
    })
  })
})
