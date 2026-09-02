import { describe, it, expect, vi } from 'vitest'
import { formatBnbYaml } from './formatBnbYaml'

describe('formatBnbYaml', () => {
  it('returns the input unchanged when there is nothing to calculate', () => {
    const content = 'character:\n  name: Test\n'
    const result = formatBnbYaml(content)

    expect(result.error).toBeUndefined()
    expect(result.formatted).toBe(content)
  })

  it('flags invalid YAML syntax without throwing', () => {
    const content = 'character:\n  name: [unterminated\n'
    const result = formatBnbYaml(content)

    expect(result.error).toBe('Invalid YAML syntax.')
    expect(result.formatted).toBe(content)
  })

  it('recalculates and reformats a character with abilities', () => {
    const content = [
      'character:',
      '  abilities:',
      '    strength: [16, {base: 16}]',
      '',
    ].join('\n')

    const result = formatBnbYaml(content)

    expect(result.error).toBeUndefined()
    expect(result.formatted).toContain('strength:')
  })

  it('surfaces calculation errors from bnb-core instead of throwing', async () => {
    vi.resetModules()
    vi.doMock('bnb-core', () => ({
      validateBeefBrainData: () => true,
      updateCalculatedFields: () => {
        throw new Error('boom')
      },
    }))

    const { formatBnbYaml: mockedFormat } = await import('./formatBnbYaml')
    const result = mockedFormat('character:\n  name: Test\n')

    expect(result.error).toBe('boom')

    vi.doUnmock('bnb-core')
    vi.resetModules()
  })
})
