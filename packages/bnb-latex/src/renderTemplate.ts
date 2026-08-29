import { LatexGenerationError } from './errors'
import type { LatexFieldMap } from './types'

const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

const LATEX_ESCAPE_MAP: Record<string, string> = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  '#': String.raw`\#`,
  '$': String.raw`\$`,
  '%': String.raw`\%`,
  '&': String.raw`\&`,
  '_': String.raw`\_`,
  '^': String.raw`\textasciicircum{}`,
  '~': String.raw`\textasciitilde{}`,
}

function escapeLatexText(value: string): string {
  return value.replace(/[\\{}#$%&_^\~]/g, (char) => LATEX_ESCAPE_MAP[char])
}

export function renderTemplate(template: string, fields: LatexFieldMap): string {
  return template.replace(TOKEN_PATTERN, (_fullMatch, key: string) => {
    const value = fields[key]
    if (value === undefined) {
      throw new LatexGenerationError(
        'INVALID_TEMPLATE',
        `Missing template field "${key}".`,
      )
    }
    return escapeLatexText(String(value))
  })
}
