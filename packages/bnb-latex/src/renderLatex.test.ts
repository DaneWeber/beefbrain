import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, expect, it } from '@jest/globals'
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
    expect(result.latex).toContain('D\\&D 3.5 Primary Sheet (Streamlined Draft)')
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
})
