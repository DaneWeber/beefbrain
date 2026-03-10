import { readFileSync } from 'fs'
import { join } from 'path'

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
  }>
}

export interface Schema {
  root: SchemaTypeDefinition
  [typeName: string]: SchemaTypeDefinition
}

let cachedSchema: Schema | null = null

/**
 * Load the schema from the JSON file
 * @param schemaName - Name of the schema (e.g., 'dnd35-character')
 * @returns The parsed schema
 */
export function loadSchema(schemaName: string): Schema {
  if (cachedSchema) {
    return cachedSchema
  }

  const schemaPath = join(
    __dirname,
    '..',
    'schema',
    'dnd35',
    `${schemaName}.json`,
  )
  const schemaContent = readFileSync(schemaPath, 'utf-8')
  cachedSchema = JSON.parse(schemaContent) as Schema
  return cachedSchema
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
  return schema[typeName]
}

/**
 * Reset the cached schema (useful for testing)
 */
export function resetSchemaCache(): void {
  cachedSchema = null
}
