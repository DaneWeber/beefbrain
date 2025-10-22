/**
 * Beef Brain Core Library
 * 
 * The library that powers the human-readable data formats for TTRPG character and creature calculation.
 * 
 * @public
 */

/**
 * Validates that a YAML file is a valid Beef Brain data file.
 * @param yamlContent - The YAML content to validate
 * @returns True if valid, false otherwise
 * @public
 */
export function validateBeefBrainData(yamlContent: string): boolean {
  // Basic YAML validation - check for proper structure
  try {
    // Check if content is empty (valid case)
    if (!yamlContent.trim()) {
      return true
    }

    // Basic YAML syntax validation
    // Check for proper key-value structure (simple heuristic)
    const lines = yamlContent.split('\n').filter(line => line.trim())
    
    for (const line of lines) {
      const trimmed = line.trim()
      // Skip YAML document markers and comments
      if (trimmed.startsWith('---') || trimmed.startsWith('#') || !trimmed) {
        continue
      }
      
      // Check if line has proper key: value structure
      if (trimmed.includes(':')) {
        // Check for invalid YAML - multiple colons without proper structure
        // Invalid case: "character: abilities: strength: [...]"
        const colonParts = trimmed.split(':')
        if (colonParts.length > 2) {
          // Multiple colons on one line without proper indentation indicates invalid YAML
          // Check if this is a valid nested structure (should be properly indented)
          const beforeFirstColon = colonParts[0]?.trim() || ''
          const afterFirstColon = colonParts.slice(1).join(':').trim()
          
          // If there are multiple colons and the part after first colon also contains colons
          // without proper YAML array/object syntax, it's invalid
          if (afterFirstColon.includes(':') && 
              !afterFirstColon.startsWith('[') && 
              !afterFirstColon.startsWith('{') &&
              beforeFirstColon.length > 0) {
            return false
          }
        }
        continue
      } else if (trimmed.startsWith('-') || trimmed.startsWith('[') || trimmed.startsWith('{')) {
        // Valid array or object syntax
        continue
      } else {
        // Invalid YAML structure - no proper key: value pairs
        return false
      }
    }
    
    return true
  } catch {
    return false
  }
}

/**
 * Updates the calculated fields in a Beef Brain data file.
 * @param yamlContent - The YAML content to update
 * @returns Updated YAML content with calculated fields
 * @public
 */
export function updateCalculatedFields(yamlContent: string): string {
  // TODO: Implement calculated field updates
  return yamlContent
}

/**
 * Applies a modifier to a Beef Brain data file.
 * @param yamlContent - The YAML content to modify
 * @param modifier - The modifier to apply
 * @returns Modified YAML content
 * @public
 */
export function applyModifier(yamlContent: string, modifier: unknown): string {
  // TODO: Implement modifier application
  console.log('Applying modifier:', modifier, 'to content of length:', yamlContent.length)
  return yamlContent
}

// Export all functions
export * from './types'