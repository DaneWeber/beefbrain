import type { Schema } from './schemaLoader'
import { getTypeDefinition } from './schemaLoader'

/**
 * Evaluate a schema formula with given context
 * @param formula - The formula string to evaluate
 * @param variables - Variable definitions from schema
 * @param context - The data context (parent array, current value, etc.)
 * @returns The calculated value
 */
export function evaluateFormula(
  formula: string,
  variables: Record<string, string>,
  context: {
    current?: unknown
    parent?: unknown[]
    root?: unknown
  },
): number {
  // First, resolve all variables
  const resolvedVars: Record<string, unknown> = {}

  for (const [varName, varPath] of Object.entries(variables)) {
    resolvedVars[varName] = resolveVariablePath(varPath, context)
  }

  // Now evaluate the formula with resolved variables
  return evaluateExpression(formula, resolvedVars)
}

/**
 * Resolve a variable path like "parent[0]" or "parent[2][]"
 * @param path - The path expression
 * @param context - The data context
 * @returns The resolved value
 */
function resolveVariablePath(
  path: string,
  context: { current?: unknown; parent?: unknown[]; root?: unknown },
): unknown {
  // Handle parent[index] references
  const parentMatch = path.match(/^parent\[(\d+)\](\[\])?$/)
  if (parentMatch && parentMatch[1]) {
    const index = parseInt(parentMatch[1], 10)
    const isArray = parentMatch[2] === '[]'

    if (!context.parent || !Array.isArray(context.parent)) {
      return isArray ? [] : undefined
    }

    const value = context.parent[index]

    if (isArray) {
      // Return array of all numeric values
      if (value && typeof value === 'object') {
        return Object.values(value).filter((v) => typeof v === 'number')
      }
      return []
    }

    return value
  }

  // Handle direct references like "score"
  return context.current
}

/**
 * Evaluate a mathematical expression with variables
 * @param expression - The expression to evaluate
 * @param variables - Resolved variable values
 * @returns The calculated result
 */
function evaluateExpression(
  expression: string,
  variables: Record<string, unknown>,
): number {
  // Replace variable references
  let expr = expression

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const [varName, varValue] of Object.entries(variables)) {
    // Handle special case for underscore check
    if (varValue === '_' || varValue === undefined) {
      expr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), `"_"`)
    } else if (Array.isArray(varValue)) {
      // Replace array variables with their representation
      const arrayValues = varValue.join(',')
      expr = expr.replace(
        new RegExp(`\\b${varName}\\b`, 'g'),
        `[${arrayValues}]`,
      )
    } else {
      expr = expr.replace(new RegExp(`\\b${varName}\\b`, 'g'), String(varValue))
    }
  }

  // Handle sum() function for array summation
  expr = expr.replace(/sum\(([^)]+)\)/g, (_match, arr) => {
    try {
      // eslint-disable-next-line no-eval
      const values = eval(arr) // Using eval for simplicity, consider safer parser for production
      if (Array.isArray(values)) {
        return String(
          values.reduce(
            (sum, val) => sum + (typeof val === 'number' ? val : 0),
            0,
          ),
        )
      }
      return '0'
    } catch {
      return '0'
    }
  })

  // Replace floor function with Math.floor
  expr = expr.replace(/\bfloor\b/g, 'Math.floor')

  // Evaluate the final expression
  try {
    // Handle ternary operator and comparison
    // eslint-disable-next-line no-eval
    const result = eval(expr)
    return typeof result === 'number' ? result : 0
  } catch {
    // Silently return 0 for invalid expressions
    return 0
  }
}

/**
 * Calculate a field value based on schema definition
 * @param schema - The schema object
 * @param typeName - Name of the type
 * @param data - The actual data array
 * @param arrayIndex - Index within the array to calculate
 * @returns The calculated value
 */
export function calculateFieldValue(
  schema: Schema,
  typeName: string,
  data: unknown[],
  arrayIndex: number,
): number | undefined {
  const typeDef = getTypeDefinition(schema, typeName)

  if (!typeDef || !typeDef.calculation) {
    return undefined
  }

  const context = {
    current: data[arrayIndex],
    parent: data,
    root: null, // Could be extended to pass root data
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
