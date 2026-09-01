import { describe, expect, it } from 'vitest'
import { renderTemplate } from './renderTemplate'
import { LatexGenerationError } from './errors'

describe('renderTemplate', () => {
  it('escapes latex-special characters in substituted values', () => {
    const output = renderTemplate('Name: {{name}}', {
      name: 'A&B_100%',
    })
    expect(output).toBe('Name: A\\&B\\_100\\%')
  })

  it('throws when a required template field is missing', () => {
    expect(() => renderTemplate('Hello {{name}}', {})).toThrow(
      LatexGenerationError,
    )
  })

  it('substitutes a raw field without escaping LaTeX structure', () => {
    const output = renderTemplate('Table:\n{{{rows}}}', {
      rows: 'A & B \\\\\nC & D \\\\',
    })
    expect(output).toBe('Table:\n' + 'A & B \\\\\nC & D \\\\')
  })

  it('still escapes an adjacent two-brace token next to a raw one', () => {
    const output = renderTemplate('{{{rows}}} {{name}}', {
      rows: 'A & B',
      name: 'A&B',
    })
    expect(output).toBe('A & B A\\&B')
  })

  it('throws when a required raw template field is missing', () => {
    expect(() => renderTemplate('{{{rows}}}', {})).toThrow(LatexGenerationError)
  })
})
