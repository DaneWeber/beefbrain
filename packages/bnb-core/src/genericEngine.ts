import type { SchemaComponentBindings } from './schemaLoader'

/**
 * Resolve a jq-style path to a value in the data object.
 * Supports: .a.b.c, .a.b[0], .a.b[0].c
 */
function resolvePath(data: unknown, path: string): unknown {
  if (!path.startsWith('.')) return undefined
  const clean = path.substring(1)
  if (!clean) return data

  let current: unknown = data
  // Split on dots but preserve bracket notation
  const segments = clean.match(/[^.[\]]+|\[\d+\]/g)
  if (!segments) return undefined

  for (const seg of segments) {
    if (current === undefined || current === null) return undefined
    const bracketMatch = seg.match(/^\[(\d+)\]$/)
    if (bracketMatch) {
      if (Array.isArray(current)) {
        current = current[parseInt(bracketMatch[1]!, 10)]
      } else {
        return undefined
      }
    } else {
      if (typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[seg]
      } else if (Array.isArray(current)) {
        // Try numeric index
        const idx = parseInt(seg, 10)
        if (!isNaN(idx)) {
          current = current[idx]
        } else {
          return undefined
        }
      } else {
        return undefined
      }
    }
  }
  return current
}

/**
 * Resolve a path that may include a trailing property after array index.
 * e.g., ".character.abilities.strength[1].str"
 * → navigate to .character.abilities.strength, then [1], then .str
 */
function resolveBindingPath(data: unknown, path: string): unknown {
  if (!path.startsWith('.')) return undefined

  // Split path into segments, handling [N] notation
  const parts: Array<
    { type: 'prop'; name: string } | { type: 'index'; idx: number }
  > = []
  const regex = /\.([^.[]+)|\[(\d+)\]/g
  let match
  while ((match = regex.exec(path)) !== null) {
    if (match[1] !== undefined) {
      parts.push({ type: 'prop', name: match[1] })
    } else if (match[2] !== undefined) {
      parts.push({ type: 'index', idx: parseInt(match[2], 10) })
    }
  }

  let current: unknown = data
  for (const part of parts) {
    if (current === undefined || current === null) return undefined
    if (part.type === 'prop') {
      if (typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, unknown>)[part.name]
      } else {
        return undefined
      }
    } else {
      if (Array.isArray(current)) {
        current = current[part.idx]
      } else {
        return undefined
      }
    }
  }

  // If the result is a single-key object (from YAML spread format like {str: 2}),
  // extract the value
  if (
    current !== null &&
    typeof current === 'object' &&
    !Array.isArray(current)
  ) {
    const keys = Object.keys(current as Record<string, unknown>)
    if (keys.length === 1) {
      return (current as Record<string, unknown>)[keys[0]!]
    }
  }

  return current
}

/**
 * Apply component bindings from the schema to the data.
 *
 * Walks all [total, {mods}] style arrays in the data.
 * For each modifier key that matches a componentBinding, resolves the source
 * value and updates the modifier. Then resums the total.
 *
 * Returns true if any changes were made.
 */
export function applyComponentBindings(
  data: unknown,
  bindings: SchemaComponentBindings,
): boolean {
  let hasChanges = false

  // Resolve all binding source values upfront
  const resolvedBindings: Record<string, number | undefined> = {}
  for (const [key, source] of Object.entries(bindings)) {
    if (typeof source === 'string') {
      const value = resolveBindingPath(data, source)
      resolvedBindings[key] = typeof value === 'number' ? value : undefined
    }
    // TODO: handle formula bindings
  }

  // Walk all objects in the data looking for [total, {mods}] patterns
  walkAndBind(data, resolvedBindings, (changed) => {
    if (changed) hasChanges = true
  })

  return hasChanges
}

/**
 * Recursively walk data looking for arrays that match the [total, {mods}] pattern.
 * When a modifier key matches a binding, update it and resum.
 */
function walkAndBind(
  node: unknown,
  bindings: Record<string, number | undefined>,
  onChange: (changed: boolean) => void,
): void {
  if (Array.isArray(node)) {
    // Check if this is a [total, {mods}, ...] pattern
    if (node.length >= 2 && typeof node[0] === 'number') {
      const mods = node[1]
      if (mods && typeof mods === 'object' && !Array.isArray(mods)) {
        const modsObj = mods as Record<string, unknown>
        let changed = false

        for (const [key, value] of Object.entries(modsObj)) {
          if (key in bindings && typeof value === 'number') {
            const newVal = bindings[key]
            if (newVal !== undefined && value !== newVal) {
              modsObj[key] = newVal
              changed = true
            }
          }
        }

        if (changed) {
          // Resum total
          let sum = 0
          for (const v of Object.values(modsObj)) {
            if (typeof v === 'number') {
              sum += v
              continue
            }
            if (Array.isArray(v) && typeof v[0] === 'number') {
              sum += v[0]
            }
          }
          node[0] = sum
          onChange(true)
        }
      }
    }

    // Recurse into array elements
    for (const item of node) {
      walkAndBind(item, bindings, onChange)
    }
  } else if (node && typeof node === 'object') {
    // Recurse into object values
    for (const value of Object.values(node as Record<string, unknown>)) {
      walkAndBind(value, bindings, onChange)
    }
  }
}
