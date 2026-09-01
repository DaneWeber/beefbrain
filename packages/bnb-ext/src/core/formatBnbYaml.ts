import { updateCalculatedFields, validateBeefBrainData } from 'bnb-core'

/**
 * Result of formatting a BeefBrain YAML document.
 */
export interface FormatResult {
  /** The formatted content. Equals the input when `error` is set. */
  formatted: string
  /** Set when the document could not be formatted. */
  error?: string
}

/**
 * Formats a BeefBrain character YAML document using bnb-core: applies
 * calculation/propagation of derived fields and re-serializes with bnb-core's
 * compact YAML style.
 */
export function formatBnbYaml(content: string): FormatResult {
  if (!validateBeefBrainData(content)) {
    return { formatted: content, error: 'Invalid YAML syntax.' }
  }

  try {
    return { formatted: updateCalculatedFields(content) }
  } catch (err) {
    return { formatted: content, error: (err as Error).message }
  }
}
