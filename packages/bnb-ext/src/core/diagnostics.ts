import { parseDocument } from 'yaml'
import { updateCalculatedFields } from 'bnb-core'

export type BnbDiagnosticSeverity = 'error' | 'warning'

export interface BnbDiagnosticRange {
  /** 1-based line number. */
  startLine: number
  /** 1-based column number. */
  startCol: number
  endLine: number
  endCol: number
}

export interface BnbDiagnostic {
  message: string
  severity: BnbDiagnosticSeverity
  range: BnbDiagnosticRange
}

const UNKNOWN_RANGE: BnbDiagnosticRange = {
  startLine: 1,
  startCol: 1,
  endLine: 1,
  endCol: 1,
}

type LinePos = { line: number; col: number }

function rangeFromLinePos(linePos: [LinePos, LinePos?]): BnbDiagnosticRange {
  const start = linePos[0]
  const end = linePos[1] ?? start
  return {
    startLine: start.line,
    startCol: start.col,
    endLine: end.line,
    endCol: end.col,
  }
}

/**
 * Computes diagnostics for a BeefBrain character YAML document: YAML syntax
 * errors/warnings (with real line/column ranges from the `yaml` parser), and
 * calculation errors raised by bnb-core's propagation engine.
 *
 * Returns plain data (no VS Code types) so this stays unit-testable without
 * the `vscode` module.
 */
export function computeDiagnostics(content: string): BnbDiagnostic[] {
  const doc = parseDocument(content)
  const diagnostics: BnbDiagnostic[] = []

  for (const error of doc.errors) {
    diagnostics.push({
      message: error.message,
      severity: 'error',
      range: error.linePos ? rangeFromLinePos(error.linePos) : UNKNOWN_RANGE,
    })
  }
  for (const warning of doc.warnings) {
    diagnostics.push({
      message: warning.message,
      severity: 'warning',
      range: warning.linePos
        ? rangeFromLinePos(warning.linePos)
        : UNKNOWN_RANGE,
    })
  }

  // Calculation only makes sense once the YAML itself parses.
  if (doc.errors.length > 0) {
    return diagnostics
  }

  try {
    updateCalculatedFields(content)
  } catch (err) {
    diagnostics.push({
      message: (err as Error).message,
      severity: 'error',
      range: UNKNOWN_RANGE,
    })
  }

  return diagnostics
}
