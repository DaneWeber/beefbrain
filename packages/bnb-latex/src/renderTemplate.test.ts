import { describe, expect, it } from '@jest/globals'
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
    expect(() => renderTemplate('Hello {{name}}', {})).toThrow(LatexGenerationError)
  })
})
