import dnd35CharacterSchema from '../schema/dnd35/dnd35-character.json'
import mnm3CharacterSchema from '../schema/mnm3/mnm3-character.json'

/**
 * Schema type definitions
 */
export interface SchemaValidValue {
  integers?: {
    min?: number
    max?: number
  }
}

export interface SchemaCalculation {
  formula: string
  variables: Record<string, string>
}

export interface SchemaArrayElement {
  name?: string
  type: string
  optional?: boolean
  description?: string
  calculation?: SchemaCalculation
}

export interface SchemaTypeDefinition {
  type?: string
  validValues?: (string | SchemaValidValue)[]
  calculation?: SchemaCalculation
  array?: Record<string, SchemaArrayElement>
  children?: Array<{
    name: string
    type: string
    optional?: boolean
    min?: number
    max?: number
    description?: string
  }>
  additionalChildren?: {
    type: string
    description?: string
  }
  items?: { type: string }
  description?: string
}

/**
 * Component bindings: when a modifier object has a key matching one of these,
 * its value should be set to the resolved source path.
 * e.g., "str": ".character.abilities.strength[1].str" means
 * anywhere a [total, {str: N, ...}] pattern appears, str should equal the strength modifier.
 */
export interface SchemaComponentBindings {
  [componentKey: string]:
    | string
    | {
        formula: string
        variables: Record<string, string>
      }
}

/**
 * Schema-defined function that gets registered into the math evaluator.
 */
export interface SchemaFunction {
  params: string[]
  formula: string
}

/**
 * Lookup table for formulas to reference.
 */
export interface SchemaLookupTable {
  values: number[]
  description?: string
}

/**
 * Conditional component: inject/remove a component in a modifier object based on a condition.
 */
export interface SchemaConditionalComponent {
  id: string
  condition: string
  conditionVariables?: Record<string, string>
  target: string
  key: string
  value: number | { formula: string; variables: Record<string, string> }
  removeIfFalse: boolean
  description?: string
}

export interface Schema {
  root: SchemaTypeDefinition
  componentBindings?: SchemaComponentBindings
  functions?: Record<string, SchemaFunction>
  lookupTables?: Record<string, SchemaLookupTable>
  conditionalComponents?: SchemaConditionalComponent[]
  [typeName: string]:
    | SchemaTypeDefinition
    | SchemaComponentBindings
    | Record<string, SchemaFunction>
    | Record<string, SchemaLookupTable>
    | SchemaConditionalComponent[]
    | undefined
}

const schemaCache: Record<string, Schema> = {}

const SCHEMAS: Record<string, Schema> = {
  'dnd35-character': dnd35CharacterSchema as Schema,
  'mnm3-character': mnm3CharacterSchema as Schema,
}

/**
 * Load the schema from the JSON file
 * @param schemaName - Name of the schema (e.g., 'dnd35-character')
 * @returns The parsed schema
 */
export function loadSchema(schemaName: string): Schema {
  if (schemaCache[schemaName]) {
    return schemaCache[schemaName]
  }

  const schema = SCHEMAS[schemaName]
  if (!schema) {
    throw new Error(
      `Unknown schema "${schemaName}". Available schemas: ${Object.keys(
        SCHEMAS,
      ).join(', ')}`,
    )
  }
  schemaCache[schemaName] = schema
  return schema
}

/**
 * Get type definition from schema
 * @param schema - The schema object
 * @param typeName - Name of the type to look up
 * @returns The type definition or undefined
 */
export function getTypeDefinition(
  schema: Schema,
  typeName: string,
): SchemaTypeDefinition | undefined {
  return schema[typeName] as SchemaTypeDefinition | undefined
}

/**
 * Reset the cached schema (useful for testing)
 */
export function resetSchemaCache(): void {
  for (const key of Object.keys(schemaCache)) {
    delete schemaCache[key]
  }
}
