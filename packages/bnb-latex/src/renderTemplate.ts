import { LatexGenerationError } from './errors'
import type { LatexFieldMap } from './types'

// {{{key}}} substitutes a field verbatim (already-formed LaTeX structure).
// {{key}} substitutes a field with LaTeX-escaped text. The raw pattern is
// applied first so it consumes the full triple-brace span before the
// escaped pattern's looser two-brace match could otherwise pick up the
// inner `{{key}}` left by a partial match.
const RAW_TOKEN_PATTERN = /\{\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}\}/g
const TOKEN_PATTERN = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

const LATEX_ESCAPE_MAP: Record<string, string> = {
  '\\': String.raw`\textbackslash{}`,
  '{': String.raw`\{`,
  '}': String.raw`\}`,
  '#': String.raw`\#`,
  $: String.raw`\$`,
  '%': String.raw`\%`,
  '&': String.raw`\&`,
  _: String.raw`\_`,
  '^': String.raw`\textasciicircum{}`,
  '~': String.raw`\textasciitilde{}`,
}

export function escapeLatexText(value: string): string {
  return value.replace(/[\\{}#$%&_^~]/g, (char) => {
    const escaped = LATEX_ESCAPE_MAP[char]
    return escaped ?? char
  })
}

function lookupField(fields: LatexFieldMap, key: string): string {
  const value = fields[key]
  if (value === undefined) {
    throw new LatexGenerationError(
      'INVALID_TEMPLATE',
      `Missing template field "${key}".`,
    )
  }
  return String(value)
}

export function renderTemplate(
  template: string,
  fields: LatexFieldMap,
): string {
  const withRawFields = template.replace(
    RAW_TOKEN_PATTERN,
    (_fullMatch, key: string) => lookupField(fields, key),
  )
  return withRawFields.replace(TOKEN_PATTERN, (_fullMatch, key: string) =>
    escapeLatexText(lookupField(fields, key)),
  )
}
