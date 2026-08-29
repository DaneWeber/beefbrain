import type { LatexGenerationErrorCode } from './types'

export class LatexGenerationError extends Error {
  readonly code: LatexGenerationErrorCode

  constructor(code: LatexGenerationErrorCode, message: string) {
    super(message)
    this.name = 'LatexGenerationError'
    this.code = code
  }
}
