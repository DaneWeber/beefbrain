import type { Schema } from './schemaLoader'
import { getTypeDefinition } from './schemaLoader'
import * as mathjs from 'mathjs'

// Create a mathjs instance with all standard functions
// @ts-expect-error mathjs namespace typing for `all` is incomplete here
const math = mathjs.create(mathjs.all)

// Add custom type-checking functions
math.import(
  {
    isNum: (value: unknown) => typeof value === 'number',
    isStr: (value: unknown) => typeof value === 'string',
    isArray: (value: unknown) => Array.isArray(value),
    isObject: (value: unknown) =>
      typeof value === 'object' && value !== null && !Array.isArray(value),
  },
  { override: true },
)

/**
 * Simple jq-style path resolver for our specific use cases
 * @param data - The root data object
 * @param path - The jq-style path
 * @returns The resolved value
 */
function resolveJqPath(data: unknown, path: string): unknown {
  if (!path.startsWith('.')) {
    return undefined
  }

  function collectNumericValues(value: unknown): number[] {
    if (Array.isArray(value)) {
      return value.filter((v): v is number => typeof v === 'number')
    }

    if (value && typeof value === 'object') {
      const values: number[] = []
      for (const entry of Object.values(value)) {
        if (typeof entry === 'number') {
          values.push(entry)
          continue
        }
        if (Array.isArray(entry) && typeof entry[0] === 'number') {
          values.push(entry[0])
        }
      }
      return values
    }

    return []
  }

  // Remove leading dot
  const cleanPath = path.substring(1)
  if (!cleanPath) {
    return data
  }

  const segments = cleanPath.split('.')
  let current: unknown = data

  for (const segment of segments) {
    if (!segment) continue

    // Handle array index with collection [n][]
    const arrayIndexWithCollectionMatch = segment.match(
      /^([^[]+)\[(\d+)\]\[\]$/,
    )
    if (arrayIndexWithCollectionMatch && arrayIndexWithCollectionMatch[2]) {
      const propName = arrayIndexWithCollectionMatch[1]
      const index = parseInt(arrayIndexWithCollectionMatch[2], 10)

      if (propName && current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[propName]
      }

      if (Array.isArray(current)) {
        current = current[index]
      } else {
        return undefined
      }

      // Now collect numeric values from this element
      if (Array.isArray(current)) {
        return collectNumericValues(current)
      } else if (current && typeof current === 'object') {
        return collectNumericValues(current)
      }
      return []
    }

    // Handle array collection []
    if (segment.endsWith('[]')) {
      const propName = segment.slice(0, -2)

      // Access property if there's a name
      if (propName && current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[propName]
      }

      // Collect numeric values
      if (Array.isArray(current)) {
        return collectNumericValues(current)
      } else if (current && typeof current === 'object') {
        return collectNumericValues(current)
      }
      return []
    }

    // Handle array index [n]
    const arrayIndexMatch = segment.match(/^([^[]+)\[(\d+)\]$/)
    if (arrayIndexMatch && arrayIndexMatch[2]) {
      const propName = arrayIndexMatch[1]
      const index = parseInt(arrayIndexMatch[2], 10)

      if (propName && current && typeof current === 'object') {
        current = (current as Record<string, unknown>)[propName]
      }

      if (Array.isArray(current)) {
        current = current[index]
      } else {
        return undefined
      }
      continue
    }

    // Simple property access
    if (current && typeof current === 'object' && segment in current) {
      current = (current as Record<string, unknown>)[segment]
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Evaluate a schema formula with given context
 * @param formula - The formula string to evaluate
 * @param variables - Variable definitions from schema
 * @param context - The data context (parent array, current value, root, and current path)
 * @returns The calculated value
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, string>,
  context: {
    current?: unknown
    parent?: unknown[]
    root?: unknown
    currentPath?: string[]
  },
): number {
  // First, resolve all variables using jq
  const resolvedVars: Record<string, unknown> = {}

  for (const [varName, varPath] of Object.entries(variables)) {
    resolvedVars[varName] = resolveVariablePath(varPath, context)
  }

  // Now evaluate the formula with mathjs
  return evaluateExpression(formula, resolvedVars)
}

/**
 * Resolve a variable path using jq-style paths
 * @param path - The path expression (jq syntax)
 * @param context - The data context
 * @returns The resolved value
 */
function resolveVariablePath(
  path: string,
  context: {
    current?: unknown
    parent?: unknown[]
    root?: unknown
    currentPath?: string[]
  },
): unknown {
  try {
    // Handle parent() function - expand before passing to jq
    let expandedPath = path

    // Handle parent(n) function calls
    const parentFuncMatch = path.match(/^parent\((\d+)\)(.*)$/)
    if (parentFuncMatch && parentFuncMatch[1]) {
      const depth = parseInt(parentFuncMatch[1], 10)
      const rest = parentFuncMatch[2] || ''

      if (context.currentPath && context.currentPath.length >= depth) {
        // Navigate up to parent(n) and construct the path
        const parentPath = context.currentPath.slice(0, -depth)
        expandedPath = '.' + parentPath.join('.') + rest
      } else {
        return undefined
      }
    }

    // Handle shorthand "parent" (same as parent(1))
    if (
      path === 'parent' ||
      path.startsWith('parent[') ||
      path.startsWith('parent.')
    ) {
      if (path === 'parent') {
        // Get the parent object/array itself
        if (context.currentPath && context.currentPath.length >= 1) {
          const parentPath = context.currentPath.slice(0, -1)
          expandedPath = '.' + parentPath.join('.')
        } else {
          return context.parent
        }
      } else {
        // Handle parent[index] or parent.property
        const match = path.match(/^parent(\[.+\]|\..*)?$/)
        if (match) {
          const suffix = match[1] || ''

          // If we have array indexing like parent[n] or parent[n][], use direct parent access
          // because these are inherently relative to the immediate parent array
          if (suffix.startsWith('[') && context.parent) {
            const indexMatch = suffix.match(/\[(\d+)\](\[\])?/)
            if (indexMatch && indexMatch[1]) {
              const index = parseInt(indexMatch[1], 10)
              const value = Array.isArray(context.parent)
                ? context.parent[index]
                : undefined
              if (
                indexMatch[2] === '[]' &&
                value &&
                typeof value === 'object'
              ) {
                return collectNumericValues(value)
              }
              return value
            }
          }

          // For property access like parent.foo, try path expansion if available
          if (context.currentPath && context.currentPath.length >= 1) {
            const parentPath = context.currentPath.slice(0, -1)
            expandedPath = '.' + parentPath.join('.') + suffix
          } else {
            return context.parent
          }
        } else {
          return context.parent
        }
      }
    }

    // Handle absolute paths (start with .)
    if (expandedPath.startsWith('.')) {
      const result = resolveJqPath(context.root, expandedPath)
      return result
    }

    // Handle simple variable references (return current value)
    return context.current
  } catch (error) {
    // If jq fails, return undefined
    console.warn(`Failed to resolve path "${path}":`, error)
    return undefined
  }
}

/**
 * Evaluate a mathematical expression with variables using mathjs
 * @param expression - The expression to evaluate
 * @param variables - Resolved variable values
 * @returns The calculated result
 */
function evaluateExpression(
  expression: string,
  variables: Record<string, unknown>,
): number {
  try {
    // Prepare scope for mathjs evaluation
    const scope: Record<string, unknown> = {}

    for (const [varName, varValue] of Object.entries(variables)) {
      if (varValue === undefined) {
        scope[varName] = 0
      } else if (Array.isArray(varValue)) {
        scope[varName] = varValue
      } else {
        scope[varName] = varValue
      }
    }

    // Evaluate using mathjs
    const result = math.evaluate(expression, scope)

    // Return numeric result, or 0 if not a number
    return typeof result === 'number' ? result : 0
  } catch (error) {
    console.warn(`Failed to evaluate expression "${expression}":`, error)
    return 0
  }
}

/**
 * Calculate a field value based on schema definition
 * @param schema - The schema object
 * @param typeName - Name of the type
 * @param data - The actual data array
 * @param arrayIndex - Index within the array to calculate
 * @param root - The root data object (optional)
 * @param currentPath - The path to the current field being calculated (optional)
 * @returns The calculated value
 */
export function calculateFieldValue(
  schema: Schema,
  typeName: string,
  data: unknown[],
  arrayIndex: number,
  root?: unknown,
  currentPath?: string[],
): number | undefined {
  const typeDef = getTypeDefinition(schema, typeName)

  if (!typeDef || !typeDef.calculation) {
    return undefined
  }

  const context = {
    current: data[arrayIndex],
    parent: data,
    root: root || null,
    ...(currentPath && { currentPath }),
  }

  return evaluateFormula(
    typeDef.calculation.formula,
    typeDef.calculation.variables,
    context,
  )
}

/**
 * Get the type name for an ability score based on position in array
 * @param schema - The schema object
 * @param abilityName - Name of the ability (e.g., 'strength')
 * @param position - Position in the array (0, 1, 2)
 * @returns The type name or undefined
 */
export function getAbilityArrayType(
  schema: Schema,
  abilityName: string,
  position: number,
): string | undefined {
  // Map ability names to their type definitions (e.g., 'strength' -> 'StrengthScore')
  const typeMap: Record<string, string> = {
    strength: 'StrengthScore',
    dexterity: 'DexterityScore',
    constitution: 'ConstitutionScore',
    intelligence: 'IntelligenceScore',
    wisdom: 'WisdomScore',
    charisma: 'CharismaScore',
  }

  const abilityType = typeMap[abilityName]
  if (!abilityType) {
    return undefined
  }

  const typeDef = getTypeDefinition(schema, abilityType)
  if (!typeDef || !typeDef.array) {
    return undefined
  }

  // Find the array element at this position
  const positionKey = String(position)
  const element = typeDef.array[positionKey]

  return element?.type
}
