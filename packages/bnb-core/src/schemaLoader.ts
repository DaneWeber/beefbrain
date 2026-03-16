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

export interface Schema {
  root: SchemaTypeDefinition
  [typeName: string]: SchemaTypeDefinition
}

const schemaCache: Record<string, Schema> = {}

// Map schema names to their directory paths
const SCHEMA_DIRS: Record<string, string> = {
  'dnd35-character': 'dnd35',
  'mnm3-character': 'mnm3',
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

  const dir = SCHEMA_DIRS[schemaName] || schemaName.split('-')[0] || schemaName
  const schemaPath = join(
    __dirname,
    '..',
    'schema',
    dir,
    `${schemaName}.json`,
  )
  const schemaContent = readFileSync(schemaPath, 'utf-8')
  const schema = JSON.parse(schemaContent) as Schema
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
  return schema[typeName]
}

/**
 * Reset the cached schema (useful for testing)
 */
export function resetSchemaCache(): void {
  for (const key of Object.keys(schemaCache)) {
    delete schemaCache[key]
  }
}
