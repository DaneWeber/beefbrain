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
    expect(result.latex).toContain('\\renewcommand{\\sheettitle}{Inventory}')
    expect(result.latex).toContain('\\renewcommand{\\sheettitle}{Spells}')
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

    expect(result.latex).toContain('{Description}')
    expect(result.latex).toContain('Abilities')
    expect(result.latex).toContain('\\begin{sheetblock}{Defense}')
    expect(result.latex).toContain('\\begin{sheetblock}{Movement}')
    expect(result.latex).toContain('Saves')
    expect(result.latex).toContain('Skills')
    expect(result.latex).toContain('Magic Item Slots')
    expect(result.latex).toContain('Light load & up to 58 lbs')
    expect(result.latex).toContain('longsword')
    expect(result.latex).toContain('Appraise')
  })

  it('puts the Actions page between Stats and Build', () => {
    const { latex } = renderLatex({ yaml: VALID_YAML })
    const actions = latex.indexOf('\\renewcommand{\\sheettitle}{Actions}')
    expect(actions).toBeGreaterThan(latex.indexOf('{Skills}'))
    expect(actions).toBeLessThan(
      latex.indexOf('\\renewcommand{\\sheettitle}{Inventory}'),
    )
    expect(latex).toContain('\\statrow{bullseye}{BAB}{ +1 }{ Fighter +1 }')
    expect(latex).toContain(
      '\\statrow{people-wrestling}{Grapple}{ +3 }{ Str +2, BAB +1 }',
    )
    expect(latex).toContain(
      '\\meleerow{Longsword}{+4}{1d8+2 slashing}{19-20/x2}{Weapon Focus Longsword +1; Dmg Str +2}',
    )
    expect(latex).toContain(
      '\\featrow{Weapon Focus (Longsword)}{Longsword +1}{Fighter 1}',
    )
  })

  it('orders the pages Stats, Actions, Build, Inventory, Spells', () => {
    const { latex } = renderLatex({ yaml: VALID_YAML })
    const at = (title: string) =>
      latex.indexOf(`\\renewcommand{\\sheettitle}{${title}}`)
    const skills = latex.indexOf('{Skills}')
    expect(skills).toBeLessThan(at('Actions'))
    expect(at('Actions')).toBeLessThan(at('Build'))
    expect(at('Build')).toBeLessThan(at('Inventory'))
    expect(at('Inventory')).toBeLessThan(at('Spells'))
    // Description moved from page 1 to Build.
    expect(latex.indexOf('{Description}')).toBeGreaterThan(at('Build'))
    expect(latex.indexOf('{Languages}')).toBeLessThan(skills)
    // Actions keeps the attacks; the lists behind them are on Build.
    expect(latex.indexOf('{Ammunition}')).toBeGreaterThan(at('Actions'))
    expect(latex.indexOf('{Attack Options}')).toBeLessThan(at('Build'))
    for (const list of ['Feats', 'Class Abilities', 'Special Abilities']) {
      expect(latex.indexOf(`\\flowblock{${list}}`)).toBeGreaterThan(
        at('Build'),
      )
      expect(latex.indexOf(`\\flowblock{${list}}`)).toBeLessThan(
        at('Inventory'),
      )
    }
  })

  it('shows hit dice between HP and AC', () => {
    const { latex } = renderLatex({ yaml: VALID_YAML })
    const hp = latex.indexOf('\\statrow{red-heart}{HP}')
    const hd = latex.indexOf('\\statrow{game-die}{Hit Dice}')
    expect(hd).toBeGreaterThan(hp)
    expect(hd).toBeLessThan(latex.indexOf('\\statrow{shield}{AC}'))
  })

  it('prints special notes as rows of their block, not as Defense Special', () => {
    const { latex } = renderLatex({ yaml: VALID_YAML })
    expect(latex).not.toContain('Defense Special')
    expect(latex).toContain(
      '\\noterow{0.30}{Special}{Blind Fight: no advantage to invisible melee attackers}',
    )
    expect(latex).toContain(
      '\\noterow{0.30}{Special}{Blind Fight: 1/2 penalty when unable to see}',
    )
  })

  it('renders the detailed sheet without emoji as its own template', () => {
    const plain = renderLatex({
      yaml: VALID_YAML,
      templateKey: 'dnd35-detailed-plain',
    })
    const withEmoji = renderLatex({
      yaml: VALID_YAML,
      templateKey: 'dnd35-detailed',
    })
    expect(plain.template.key).toBe('dnd35-detailed-plain')
    expect(plain.latex).toContain('\\sheetemojifalse')
    expect(plain.latex).not.toContain('\\sheetemojitrue')
    expect(withEmoji.latex).toContain('\\sheetemojitrue')
    // The switch is the only difference between the two.
    expect(plain.latex.replace('\\sheetemojifalse', '\\sheetemojitrue')).toBe(
      withEmoji.latex,
    )
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

    it('signs save totals, zero included', () => {
      const savesYaml = `---
character:
  abilities:
    dexterity: [8, dex: -1]
    constitution: [14, con: 2]
  combat:
    saves:
      fortitude: [2, {con: 2}]
      reflex: [-1, {dex: -1}]
      will: [0, {}]
`
      expect(renderField(savesYaml, 'saves.fortitude')).toBe('+2')
      expect(renderField(savesYaml, 'saves.reflex')).toBe('-1')
      expect(renderField(savesYaml, 'saves.will')).toBe('+0')
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
      - [Ioun Stone, 1, gear, 0 lbs, 9, [magic, other-slot]]
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
          '\\invitem{Ioun Stone}{1}{0}',
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
      expect(
        rows.slice(0, 12).map((row) => row.split('}').slice(0, 2).join('}')),
      ).toEqual(
        [
          ['military-helmet', 'Head'],
          ['goggles', 'Face'],
          ['prayer-beads', 'Throat'],
          ['coat', 'Shoulders'],
          ['kimono', 'Body'],
          ['t-shirt', 'Torso'],
          ['mechanical-arm', 'Arms'],
          ['gloves', 'Hands'],
          ['ring', 'Left Ring'],
          ['ring', 'Right Ring'],
          ['scarf', 'Waist'],
          ['hiking-boot', 'Feet'],
        ].map(([icon, slot]) => `\\slotrow{${icon}}{${slot}`),
      )
      expect(latex).toContain(
        '\\slotrow{coat}{Shoulders}{0}{\\slotitem{Cloak of Resistance +3}{Saves Resistance=3}}',
      )
      // The belt in the pack is a spare, not worn.
      expect(latex).toContain('\\slotrow{scarf}{Waist}{0}{}')
    })

    it('flags a slot claimed by more than one item', () => {
      expect(renderField(yaml, 'inventory.slotsTable')).toContain(
        '\\slotrow{goggles}{Face}{1}{\\slotitem{Pearl of Speech}{}\\newline \\slotitem{Third Eye}{}}',
      )
    })

    it('lists each equipped slotless item on its own row after the body slots', () => {
      const rows = renderField(yaml, 'inventory.slotsTable').split('\n')
      expect(rows.slice(12)).toEqual([
        "\\slotlessrow{Slotless}{\\slotitem{Heward's Haversack}{}}",
        '\\slotlessrow{Slotless}{\\slotitem{Ioun Stone}{}}',
      ])
    })
  })
})
