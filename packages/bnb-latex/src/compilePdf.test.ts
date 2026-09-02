import { describe, expect, it } from 'vitest'
import { compilePdf } from './compilePdf'
import { LatexGenerationError } from './errors'

describe('compilePdf', () => {
  it('rejects unsafe output base names', async () => {
    await expect(
      compilePdf({
        latex: '\\documentclass{article}\\begin{document}x\\end{document}',
        outputBaseName: '../evil',
      }),
    ).rejects.toThrow(LatexGenerationError)
  })

  it('rejects oversized latex payloads', async () => {
    await expect(
      compilePdf({
        latex: 'x'.repeat(1000),
        maxLatexBytes: 10,
      }),
    ).rejects.toThrow(LatexGenerationError)
  })

  it('surfaces missing compiler errors clearly', async () => {
    await expect(
      compilePdf({
        latex: '\\documentclass{article}\\begin{document}x\\end{document}',
        compilerCommand: 'pdflatex-command-that-does-not-exist',
      }),
    ).rejects.toThrow(/was not found|not executable/i)
  })
})
