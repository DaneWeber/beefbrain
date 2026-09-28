/**
 * Helpers for inventory item tuples:
 *   [name, qty, category, weight, id, props?, tags?, effects?]
 * `props` is a plain object, `tags` a list of strings, and `effects` a list of
 * effect arrays (see docs/bnb-core-item-feat-effects.md). Each optional part
 * is found by shape, so an item may omit any of them. This module has no
 * dependencies so browser code can import it via `bnb-core/items`.
 */

/** @public */
export type ItemEffect = unknown[]

/** @public */
export interface ItemParts {
  head: unknown[]
  props: Record<string, unknown>
  tags: string[]
  effects: ItemEffect[]
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Splits an item tuple into its fixed head (first five elements) and its
 * optional props, tags and effects.
 * @public
 */
export function splitItem(item: unknown[]): ItemParts {
  const parts: ItemParts = {
    head: item.slice(0, 5),
    props: {},
    tags: [],
    effects: [],
  }
  let sawProps = false
  let sawTags = false
  let sawEffects = false
  for (const entry of item.slice(5)) {
    if (isPlainObject(entry) && !sawProps) {
      parts.props = entry
      sawProps = true
    } else if (Array.isArray(entry)) {
      const isEffects = entry.length > 0 && entry.every((e) => Array.isArray(e))
      if (isEffects && !sawEffects) {
        parts.effects = entry as ItemEffect[]
        sawEffects = true
      } else if (!isEffects && !sawTags) {
        parts.tags = entry.map(String)
        sawTags = true
      }
    }
  }
  return parts
}

/**
 * Rebuilds an item tuple, omitting trailing parts that are empty. An empty
 * props object is kept as `{}` when tags or effects follow it.
 * @public
 */
export function joinItem(parts: ItemParts): unknown[] {
  const item = [...parts.head]
  const hasEffects = parts.effects.length > 0
  const hasTags = parts.tags.length > 0
  if (Object.keys(parts.props).length > 0 || hasTags || hasEffects) {
    item.push(parts.props)
  }
  if (hasTags || hasEffects) item.push(parts.tags)
  if (hasEffects) item.push(parts.effects)
  return item
}

function isEditableEffect(effect: ItemEffect): boolean {
  if (typeof effect[0] !== 'string') return false
  const rest = effect.slice(1)
  if (rest.length === 1 && isPlainObject(rest[0])) {
    return Object.values(rest[0]).every((v) => typeof v === 'number')
  }
  return rest.length === 1 && typeof rest[0] === 'string'
}

/**
 * Item props and effects as editable `key: value` lines. A bonus effect is
 * written as `<target>.<bonus-key>: <number>` (e.g.
 * `abilities.strength.belt-enhancement: 4`) and a note effect as
 * `<target>: <text>`. Effects that can't be written this way (list entries,
 * a bonus with a note) are left out; editItemFromLines keeps them as they are.
 * @public
 */
export function itemEditLines(item: unknown[]): string[] {
  const { props, effects } = splitItem(item)
  const lines = Object.entries(props).map(([k, v]) => `${k}: ${String(v)}`)
  for (const effect of effects) {
    if (!isEditableEffect(effect)) continue
    const [target, value] = effect as [string, unknown]
    if (isPlainObject(value)) {
      for (const [key, bonus] of Object.entries(value)) {
        lines.push(`${target}.${key}: ${String(bonus)}`)
      }
    } else {
      lines.push(`${target}: ${String(value)}`)
    }
  }
  return lines
}

function parseScalar(value: string): unknown {
  const num = Number(value)
  return value !== '' && Number.isFinite(num) ? num : value
}

/**
 * Applies edited `key: value` pairs (as produced by itemEditLines) to an item
 * tuple, returning the rebuilt tuple. A dotted key with a numeric value is a
 * bonus effect on the path before its last segment; a dotted key with a text
 * value is a note effect on that path; any other key is a plain prop.
 * @public
 */
export function editItemFromLines(
  item: unknown[],
  entries: Record<string, string>,
): unknown[] {
  const parts = splitItem(item)
  const props: Record<string, unknown> = {}
  const bonusByTarget = new Map<string, Record<string, number>>()
  const notes: ItemEffect[] = []

  for (const [rawKey, rawValue] of Object.entries(entries)) {
    const key = rawKey.trim()
    if (!key) continue
    const value = parseScalar(rawValue.trim())
    if (!key.includes('.')) {
      props[key] = value
      continue
    }
    if (typeof value === 'number') {
      const dot = key.lastIndexOf('.')
      const target = key.slice(0, dot)
      const bonusKey = key.slice(dot + 1)
      const bonus = bonusByTarget.get(target) ?? {}
      bonus[bonusKey] = value
      bonusByTarget.set(target, bonus)
    } else {
      notes.push([key, value])
    }
  }

  const effects: ItemEffect[] = [
    ...parts.effects.filter((effect) => !isEditableEffect(effect)),
    ...[...bonusByTarget].map(([target, bonus]) => [target, bonus]),
    ...notes,
  ]
  return joinItem({ ...parts, props, effects })
}

/**
 * A short human-readable summary of an item's numeric effect bonuses, e.g.
 * `belt-enhancement 4 (strength)` or
 * `deflection 1 (ac, touch-ac, flat-footed-ac)`.
 * @public
 */
export function summarizeItemEffects(item: unknown[]): string[] {
  const byBonus = new Map<string, string[]>()
  for (const effect of splitItem(item).effects) {
    const [target, bonus] = effect
    if (typeof target !== 'string' || !isPlainObject(bonus)) continue
    const label = target.split('.').pop() ?? target
    for (const [key, value] of Object.entries(bonus)) {
      if (typeof value !== 'number') continue
      const summary = `${key} ${value}`
      byBonus.set(summary, [...(byBonus.get(summary) ?? []), label])
    }
  }
  return [...byBonus].map(
    ([summary, labels]) => `${summary} (${labels.join(', ')})`,
  )
}
