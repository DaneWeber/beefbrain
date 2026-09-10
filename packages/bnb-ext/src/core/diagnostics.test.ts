import { describe, it, expect, vi } from 'vitest'
import { computeDiagnostics } from './diagnostics'

describe('computeDiagnostics', () => {
  it('returns no diagnostics for a valid, calculable document', () => {
    const content = 'character:\n  name: Test\n'
    expect(computeDiagnostics(content)).toEqual([])
  })

  it('reports a YAML syntax error with a real line/column range', () => {
    const content = ['character:', '  name: [unterminated', ''].join('\n')

    const diagnostics = computeDiagnostics(content)

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.severity).toBe('error')
    // The unterminated flow sequence is only detected once the parser hits
    // EOF looking for the closing `]`, so the reported position is line 3
    // (the empty line after the malformed entry), not line 2 where it opened.
    expect(diagnostics[0]?.range.startLine).toBe(3)
    expect(diagnostics[0]?.range.startCol).toBeGreaterThan(0)
  })

  it('does not attempt calculation when the YAML fails to parse', async () => {
    vi.resetModules()
    vi.doMock('bnb-core', () => ({
      updateCalculatedFields: vi.fn(() => {
        throw new Error('should not be called')
      }),
    }))

    const { computeDiagnostics: mockedCompute } = await import('./diagnostics')
    const diagnostics = mockedCompute('character:\n  name: [unterminated\n')

    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]?.message).not.toBe('should not be called')

    vi.doUnmock('bnb-core')
    vi.resetModules()
  })

  it('surfaces bnb-core calculation errors as diagnostics', async () => {
    vi.resetModules()
    vi.doMock('bnb-core', () => ({
      getSkillPointMismatch: vi.fn(() => undefined),
      updateCalculatedFields: () => {
        throw new Error('effect target not found')
      },
    }))

    const { computeDiagnostics: mockedCompute } = await import('./diagnostics')
    const diagnostics = mockedCompute('character:\n  name: Test\n')

    expect(diagnostics).toEqual([
      {
        message: 'effect target not found',
        severity: 'error',
        range: { startLine: 1, startCol: 1, endLine: 1, endCol: 1 },
      },
    ])

    vi.doUnmock('bnb-core')
    vi.resetModules()
  })

  it('warns when distributed skill ranks do not match available points', () => {
    const content = `character:
  abilities:
    wisdom: [14, {wis: 2}]
  skills:
    _points: [6, {ranger: 6}]
    listen: [5, {wis: 2, ranks: 3}]
    spot: [4, {wis: 2, ranks: 2}]
`

    expect(computeDiagnostics(content)).toEqual([
      {
        message:
          'Distributed skill ranks (5) do not match available skill points (6).',
        severity: 'warning',
        range: { startLine: 5, startCol: 14, endLine: 5, endCol: 30 },
      },
    ])
  })

  it('does not warn or alter data when skill point totals match', () => {
    const content = `character:
  abilities:
    wisdom: [14, {wis: 2}]
  skills:
    _points: [5, {ranger: 5}]
    listen: [5, {wis: 2, ranks: 3}]
    spot: [4, {wis: 2, ranks: 2}]
`

    expect(computeDiagnostics(content)).toEqual([])
  })
})
