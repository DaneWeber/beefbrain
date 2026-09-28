import {
  addExpectedFields,
  updateCalculatedFields,
  validateBeefBrainData,
} from 'bnb-core'

/**
 * Result of formatting a BeefBrain YAML document.
 */
export interface FormatResult {
  /** The formatted content. Equals the input when `error` is set. */
  formatted: string
  /** Set when the document could not be formatted. */
  error?: string
}

export interface FormatOptions {
  /** Add expected fields that are missing (e.g. core skills) before calculating. */
  addMissing?: boolean
}

/**
 * Formats a BeefBrain character YAML document using bnb-core: applies
 * calculation/propagation of derived fields and re-serializes with bnb-core's
 * compact YAML style.
 */
export function formatBnbYaml(
  content: string,
  options: FormatOptions = {},
): FormatResult {
  if (!validateBeefBrainData(content)) {
    return { formatted: content, error: 'Invalid YAML syntax.' }
  }

  try {
    const filled = options.addMissing ? addExpectedFields(content) : content
    return { formatted: updateCalculatedFields(filled) }
  } catch (err) {
    return { formatted: content, error: (err as Error).message }
  }
}
