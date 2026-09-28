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

  it('adds missing core skills when asked', () => {
    const content = [
      'character:',
      '  abilities:',
      '    dexterity: [14, dex: 2]',
      '  skills:',
      '    hide: [7, {dex: 2, ranks: 5}]',
      '',
    ].join('\n')

    expect(formatBnbYaml(content).formatted).not.toContain('tumble:')

    const result = formatBnbYaml(content, { addMissing: true })

    expect(result.error).toBeUndefined()
    expect(result.formatted).toContain('hide: [7, {dex: 2, ranks: 5}]')
    expect(result.formatted).toContain('_acp: [0]')
    expect(result.formatted).toContain('balance: [2, {dex: 2, acp: 0}]')
    expect(result.formatted).toContain('bluff: [0, cha: 0]')
    expect(result.formatted).toContain(
      'tumble: [.nan, {dex: 2, acp: 0, not-trained: .nan}]',
    )
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
