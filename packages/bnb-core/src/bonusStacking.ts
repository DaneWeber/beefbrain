/**
 * D&D 3.5 bonus stacking. A component key names its bonus type either
 * exactly (`deflection`) or as a `<source>-<type>` suffix (`belt-enhancement`,
 * `vest-resistance`). Bonuses of the same non-stacking type don't stack: only
 * the largest applies. Penalties (negative values) always stack, as do dodge,
 * circumstance and untyped bonuses (any key without a recognized type).
 * See docs/bnb-core-item-feat-effects.md.
 */
export const NON_STACKING_BONUS_TYPES = [
  'alchemical',
  'armor',
  'competence',
  'deflection',
  'enhancement',
  'inherent',
  'insight',
  'luck',
  'morale',
  'natural',
  'profane',
  'racial',
  'resistance',
  'sacred',
  'shield',
  'size',
] as const

/** The non-stacking bonus type a component key declares, if any. */
export function bonusType(key: string): string | undefined {
  return NON_STACKING_BONUS_TYPES.find(
    (type) => key === type || key.endsWith(`-${type}`),
  )
}

function numericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value
  // Support component entries like ranks: [13, { fighter: 13 }]
  if (Array.isArray(value) && typeof value[0] === 'number') return value[0]
  return undefined
}

/**
 * The component values that actually apply once same-type bonuses are
 * reduced to the largest one. Order follows the input.
 */
export function stackedValues(entries: Iterable<[string, unknown]>): number[] {
  const applied: number[] = []
  const bestByType = new Map<string, number>()
  for (const [key, raw] of entries) {
    const value = numericValue(raw)
    if (value === undefined) continue
    const type = bonusType(key)
    if (type === undefined || value < 0) {
      applied.push(value)
      continue
    }
    const best = bestByType.get(type)
    if (best === undefined) {
      bestByType.set(type, applied.length)
      applied.push(value)
    } else if (value > applied[best]!) {
      applied[best] = value
    }
  }
  return applied
}

/** Sum of a component map, applying the stacking rules above. */
export function sumStacked(components: Record<string, unknown>): number {
  return stackedValues(Object.entries(components)).reduce((a, b) => a + b, 0)
}
