import { LineCounter, parseDocument } from 'yaml'
import {
  formatSkillPointMismatch,
  getSkillPointMismatch,
  updateCalculatedFields,
} from 'bnb-core'

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
  const lineCounter = new LineCounter()
  const doc = parseDocument(content, { lineCounter })
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

  const mismatch = getSkillPointMismatch(doc.toJS())
  if (mismatch) {
    const pointNode = doc.getIn(
      ['character', 'skills', mismatch.fieldName],
      true,
    ) as { range?: [number, number, number?] } | undefined
    const nodeRange = pointNode?.range
    const range = nodeRange
      ? rangeFromLinePos([
          lineCounter.linePos(nodeRange[0]),
          lineCounter.linePos(nodeRange[1]),
        ])
      : UNKNOWN_RANGE

    diagnostics.push({
      message: formatSkillPointMismatch(mismatch),
      severity: 'warning',
      range,
    })
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
