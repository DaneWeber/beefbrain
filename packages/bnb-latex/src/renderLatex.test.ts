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
    expect(result.template.key).toBe('dnd35-streamlined')
    expect(result.latex).toContain(
      'D\\&D 3.5 Primary Sheet (Streamlined Draft)',
    )
    expect(result.latex).toContain('Landorf the Human Fighter')
    expect(result.latex).toContain('fighter 1')
    expect(result.latex).toContain('Inventory Sheet (Draft)')
    expect(result.latex).toContain('Spell Sheet (Draft)')
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
    expect(result.latex).toContain('Equipped Magic Items')
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
      expect(latex).toContain('Swim & -6 & +2 & Str +2 \\\\')
    })

    it('omits acp and zero-valued components from the source list', () => {
      const latex = renderSkillsTable(VALID_YAML)
      // appraise: [2, {int: 0, ranks: 2}] -> Int is zero, so only Ranks shows
      expect(latex).toContain('Appraise & +2 & +2 & Ranks +2 \\\\')
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
        'Use Magic Device & +19 & +19 & Cha +1, Ranks +13, Magic Ring +5 \\\\',
      )
    })
  })
})
