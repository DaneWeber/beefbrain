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
})
